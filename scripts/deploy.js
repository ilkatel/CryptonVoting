require('dotenv').config();
const { ethers } = require('hardhat');

const voteDuration = 3*24*60*60

async function deploy() {
  const [owner] = await ethers.getSigners()
  
  const Voting = await ethers.getContractFactory("CryptonVoting")
  const voting = await Voting.deploy(voteDuration)

  await voting.deployed()

  console.log("Contract deployed. Address:", voting.address)
  // 0x91E18084a48dE79C9C1Af509E97F5997161c3c2C
}

deploy()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
// npx hardhat run scripts/deploy.js --network rinkeby
