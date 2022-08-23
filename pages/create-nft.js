import { useState } from "react";
import { ethers } from "ethers";
import { useRouter } from "next/router";
import Web3Modal from "web3modal";
import axios from "axios";

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
        const imgUrl = `https://ipfs.io/ipfs/${resFile.data.IpfsHash}`;
        setFileUrl(imgUrl);
        console.log(imgUrl);
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
          className="mt-8 border rounded-xl p-4"
          onChange={(e) =>
            updateFormInput({ ...formInput, name: e.target.value })
          }
        />
        <textarea
          placeholder="Asset Description"
          className="mt-2 border rounded-xl p-4"
          onChange={(e) =>
            updateFormInput({ ...formInput, description: e.target.value })
          }
        />
        <input
          placeholder="Asset Price in Eth"
          className="mt-2 border rounded-xl p-4"
          onChange={(e) =>
            updateFormInput({ ...formInput, price: e.target.value })
          }
        />
        <input type="file" name="Asset" className="my-4" onChange={onChange} />
        {fileUrl && (
          <img className="rounded-xl mt-4" width="350" src={fileUrl} />
        )}
        <button
          onClick={listNFTForSale}
          className="font-bold mt-4 bg-violet-800 text-white rounded-xl p-4 shadow-lg"
        >
          Create NFT
        </button>
      </div>
    </div>
  );
}
