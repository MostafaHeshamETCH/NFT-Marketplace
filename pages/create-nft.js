import { useState } from "react";
import { ethers } from "ethers";
import { create as ipfsHttpClient } from "ipfs-http-client";
import { useRouter } from "next/router";
import Web3Modal from "web3modal";
import axios from "axios";

// import { pinFileToIPFS, pinJSONToIPFS } from "./lib/pinata";

// const client = ipfsHttpClient(
//   "https://mainnet.infura.io/v3/f664559ffc0b4966bb10ba125190a729"
// );
// const projectId = process.env.NEXT_PUBLIC_INFURA_IPFS_PROJECT_ID;
// const projectSecret = process.env.NEXT_PUBLIC_INFURA_IPFS_PROJECT_SECRET;
// const projectIdAndSecret = `${projectId}:${projectSecret}`;

const client = ipfsHttpClient({
  host: "ipfs.infura.io",
  port: 5001,
  protocol: "https",
  headers: {
    authorization: `Basic ${Buffer.from(
      "f664559ffc0b4966bb10ba125190a729"
    ).toString("base64")}`,
  },
});

// import { nftMarketAddress } from "../config";

import NFTMarketplace from "../hardhat/artifacts/contracts/NFTMarketplace.sol/NFTMarketplace.json";

export default function CreateItem() {
  const [fileUrl, setFileUrl] = useState(null);
  const [formInput, updateFormInput] = useState({
    price: "",
    name: "",
    description: "",
  });
  const router = useRouter();

  const sendFileToIPFS = async (file) => {
    if (file) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        // formData.append("name", formInput.name);
        // formData.append("description", formInput.description);
        // const pinataMetaData = {
        //   name: `${formInput.name} - ${formInput.description}`,
        // };
        // formData.append("data", JSON.stringify(pinataMetaData));
        // console.log(Process.env.PUBLIC_PINATA_API_KEY);

        const resFile = await axios({
          method: "post",
          url: "https://api.pinata.cloud/pinning/pinFileToIPFS",
          data: formData,
          headers: {
            // pinata_api_key: `${process.env.PUBLIC_PINATA_API_KEY}`,
            // pinata_secret_api_key: `${process.env.PUBLIC_PINATA_API_SECRET}`,
            pinata_api_key: "6b0e7e0750c2d546f67c",
            pinata_secret_api_key:
              "de4639498162ff7eaeca2116c8fd84b48bc173b1dbb2fa43e38b44620b137fa2",
            "Content-Type": "multipart/form-data",
          },
        });
        // const ImgHash = `ipfs://${resFile.data.IpfsHash}`;
        // console.log(ImgHash);
        const imgUrl = `https://ipfs.io/ipfs/${resFile.data.IpfsHash}`;
        setFileUrl(imgUrl);
        console.log(imgUrl);
        //Take a look at your Pinata Pinned section, you will see a new file added to you list.
      } catch (error) {
        console.log("Error sending File to IPFS: ");
        console.log(error);
      }
    }
  };

  async function onChange(e) {
    const file = e.target.files[0];
    try {
      // const added = await client.add(file, {
      //   progress: (prog) => console.log(`received: ${prog}`),
      // });
      // const url = `https://ipfs.infura.io/ipfs/${added.path}`;
      // setFileUrl(url);
      sendFileToIPFS(file);
    } catch (error) {
      console.log("onchange: Error uploading file: ", error);
    }
  }
  async function uploadToIPFS() {
    const { name, description, price } = formInput;
    if (!name || !description || !price || !fileUrl) return;
    /* first, upload to IPFS */
    const data = JSON.stringify({
      name,
      description,
      image: fileUrl,
    });

    try {
      // const added = await client.add(data);
      // const url = `https://ipfs.infura.io/ipfs/${added.path}`;
      // console.log("Uploaded successfully to IPFS: ", url);
      // /* after file is uploaded to IPFS, return the URL to use it in the transaction */
      // const formData = new FormData();
      // formData.append("data", data);
      // const resFile = await axios({
      //   method: "post",
      //   url: "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      //   data: formData,
      //   headers: {
      //     // pinata_api_key: `${process.env.PUBLIC_PINATA_API_KEY}`,
      //     // pinata_secret_api_key: `${process.env.PUBLIC_PINATA_API_SECRET}`,
      //     pinata_api_key: "6b0e7e0750c2d546f67c",
      //     pinata_secret_api_key:
      //       "de4639498162ff7eaeca2116c8fd84b48bc173b1dbb2fa43e38b44620b137fa2",
      //     // "Content-Type": "multipart/form-data",
      //   },
      // });
      // const url = `https://ipfs.io/ipfs/${resFile.data.IpfsHash}`;
      // console.log(url);
      const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;
      const json = {
        name: formInput.name,
        description: formInput.description,
        url: fileUrl,
      };
      return axios
        .post(url, json, {
          headers: {
            pinata_api_key: "6b0e7e0750c2d546f67c",
            pinata_secret_api_key:
              "de4639498162ff7eaeca2116c8fd84b48bc173b1dbb2fa43e38b44620b137fa2",
          },
        })
        .then(function (response) {
          const reply = `https://ipfs.io/ipfs/${response.data.IpfsHash}`;
          return reply;
        })
        .catch(function (error) {
          console.log(error);
        });
    } catch (error) {
      console.log("uploadToIPFS: Error uploading file: ", error);
    }
  }

  async function listNFTForSale() {
    const url = await uploadToIPFS();
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    const signer = provider.getSigner();

    /* next, create the item */
    const price = ethers.utils.parseUnits(formInput.price, "ether");
    let contract = new ethers.Contract(
      "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      NFTMarketplace.abi,
      signer
    );
    let listingPrice = await contract.getListingPrice();
    listingPrice = listingPrice.toString();
    let transaction = await contract.createToken(url, price, {
      value: listingPrice,
    });

    await transaction.wait();

    router.push("/");
  }

  return (
    <div className="flex justify-center">
      <div className="w-1/2 flex flex-col pb-12">
        <input
          placeholder="Asset Name"
          className="mt-8 border rounded p-4"
          onChange={(e) =>
            updateFormInput({ ...formInput, name: e.target.value })
          }
        />
        <textarea
          placeholder="Asset Description"
          className="mt-2 border rounded p-4"
          onChange={(e) =>
            updateFormInput({ ...formInput, description: e.target.value })
          }
        />
        <input
          placeholder="Asset Price in Eth"
          className="mt-2 border rounded p-4"
          onChange={(e) =>
            updateFormInput({ ...formInput, price: e.target.value })
          }
        />
        <input type="file" name="Asset" className="my-4" onChange={onChange} />
        {fileUrl && <img className="rounded mt-4" width="350" src={fileUrl} />}
        <button
          onClick={listNFTForSale}
          className="font-bold mt-4 bg-pink-500 text-white rounded p-4 shadow-lg"
        >
          Create NFT
        </button>
      </div>
    </div>
  );
}
