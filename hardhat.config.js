require("@nomiclabs/hardhat-waffle");
require('solidity-coverage')
require('dotenv').config();
require('./tasks/contractTasks')

const owner = JSON.parse(process.env.OWNER)

module.exports = {
  solidity: "0.8.4",
  networks: {
    hardhat: { },
    rinkeby: {
      url: `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [`${owner.privateKey}`],
      gas: 2100000,
      gasPrice: 8000000000
    }
  },
  defaultNetwork: "rinkeby",
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
}
