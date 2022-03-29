const { task } = require('hardhat/config')
require('dotenv').config()


// 0x91E18084a48dE79C9C1Af509E97F5997161c3c2C
const cAddress = process.env.CONTRACT_ADDRESS
const correctSum = "" + 1e17  // 0.1 eth

function printHash(result) {
    console.log(` >>> tx hash: ${result.hash}`)
}

async function getOwner() {
    const [owner] = await hre.ethers.getSigners()
    return owner
}

async function getContract() { 
    const metadata = require('../artifacts/contracts/Voting.sol/CryptonVoting.json')

    const voting = new hre.ethers.Contract(
        cAddress,
        metadata.abi,
        await getOwner()
    )

    return voting
}

async function addVote(_index, _addresses, _names) {
    const voting = await getContract()
    await voting.addVote(
        _index,
        _addresses,
        _names
    ).then(result => printHash(result))
    return voting
}

function toEther(_wei) {
    return hre.ethers.utils.formatEther(_wei)
}

function toWei(_eth) {
    return hre.ethers.utils.parseEther(_eth)
}

function toBytes(_string) {
    try {
        return hre.ethers.utils.formatBytes32String(_string)
    } catch(_) {
        return _string
    }
}

function fromBytes(_bytes) {
    try {
        return hre.ethers.utils.parseBytes32String(_bytes)
    } catch (_) {
        return _bytes
    }
}

function correctAddress(_addresses) {
    for (let i = 0; i < _addresses.length; i++) {
        if (hre.ethers.utils.isAddress(_addresses[i]))
            _addresses[i] = hre.ethers.utils.getAddress(_addresses[i])
        else
            throw ` >>> Incorrect address ${_addresses[i]}`
    }
    return _addresses
}

function catchError(e) {
    try {
        console.log(`\n >>> Transaction reverted with reason:\n${e.reason}\n\n >>> Error:\n${e.error}`)
    } catch(_) {
        console.log(`\n >>> Error!\n${e}`)
    }
}

// npx hardhat address
task("address", "Returns contract address")
    .setAction(async () => {
        console.log(cAddress)
})

// npx hardhat balance
task("balance", "Prints an owner balance")
    .setAction(async () => {
        const owner = await getOwner()
        const balance = await owner.getBalance()
        console.log(` >>> ${toEther(balance)} ETH`)
})

// npx hardhat addressBalance --address 0x...
task("addressBalance", "Prints an address balance")
    .addParam("address", "Account address")
    .setAction(async (taskArgs) => {
        const address = correctAddress([taskArgs.address])
        const balance = await hre.network.provider.send('eth_getBalance', [address[0]])
        console.log(` >>> ${toEther(balance)} ETH`)
})

// npx hardhat freeBalance
task("freeBalance", "Prints an free balance")
    .setAction(async () => {
        const voting = await getContract()
        const balance = await voting.getFreeBalance()
        console.log(` >>> ${toEther(balance)} ETH`)
})

// npx hardhat contractBalance
task("contractBalance", "Prints an contract balance")
    .setAction(async () => {
        const voting = await getContract()
        const balance = await voting.getBalance()
        console.log(` >>> ${toEther(balance)} ETH`)
})

// npx hardhat getTime
task("getTime", "Returns block timestamp")
    .setAction(async (taskArgs) => {
        const voting = await getContract()
        const result = await voting.currentTime()
        console.log(` >>> Current time is ${result}`)
})

// npx hardhat getTimeLeft --index 1
task("getTimeLeft", "Returns the remaining voting time")
    .addParam("index", "The index of voting")
    .setAction(async (taskArgs) => {
        const voting = await getContract()
        const result = await voting.getTimeLeft(taskArgs.index)
        console.log(` >>> Time left ${result}`)
})

// npx hardhat addVote --index 2 --addresses 0x...@@@0x... --names name1@@@name2
task("addVote", "Add new voting")
    .addParam("index", "The index of voting")
    .addParam("addresses", "Candidates addresses | string format adr1@@@adr2")
    .addParam("names", "Candidates string or bytes names | string format name1@@@name2")
    .setAction(async (taskArgs) => {
        var _addresses = taskArgs.addresses
        var _names = taskArgs.names

        const addresses = correctAddress(_addresses.split('@@@'))
        let _parseNames = _names.split('@@@')
        let names = []

        for (let i = 0; i < _parseNames.length; i++)
            names.push(toBytes(_parseNames[i]))
        try {
            const voting = await addVote(taskArgs.index, addresses, names)
            result = await voting.getVotingCandidates(taskArgs.index)
            console.log(` >>> Added successfully\n\n${result}`)
        } catch(e) {
            catchError(e)
        }
})

// npx hardhat fastAddVote --index 3
task("fastAddVote", "Add new voting with default parameters")
    .addParam("index", "The index of voting")
    .setAction(async (taskArgs) => {
        try {
            const voting = await addVote(taskArgs.index, [process.env.ACC1, process.env.ACC2], 
                [toBytes('cName1'), toBytes('cName2')])
            result = await voting.getVotingCandidates(taskArgs.index)
            console.log(` >>> Added successfully\n\n${result}`)
        } catch(e) {
            catchError(e)
        }
})

// npx hardhat getCandidates --index 1
task("getCandidates", "Returns candidates by voting")
    .addParam("index", "The index of voting")
    .setAction(async (taskArgs) => {
        const voting = await getContract()
        const result = await voting.getVotingCandidates(taskArgs.index)
        console.log(result)
})

// npx hardhat getCandidate --index 1 --name name1
task("getCandidate", "Returns candidate by voting")
    .addParam("index", "The index of voting")
    .addParam("name", "The string or bytes candidate name")
    .setAction(async (taskArgs) => {
        const name = toBytes(taskArgs.name)
        const voting = await getContract()
        const result = await voting.getCandidate(taskArgs.index, name)
        console.log(result)
})

// npx hardhat getWinners --index 2
task("getWinners", "Returns voting winners")
    .addParam("index", "The index of voting")
    .setAction(async (taskArgs) => {
        const voting = await getContract()
        const result = await voting.winners(taskArgs.index)
        if (result[0] == undefined)
            console.log(' >>> No winners')
        else
            console.log(` >>> Winners:\n ${result}`)
})

// npx hardhat vote --index 2 --name 0x634e616d65310000000000000000000000000000000000000000000000000000
// npx hardhat vote --index 2 --name cName1
task("vote", "Vote to candidate by string name")
    .addParam("index", "The index of voting")
    .addParam("name", "The string or bytes candidate name")
    .setAction(async (taskArgs) => {
        const name = toBytes(taskArgs.name)
        try {
            const voting = await getContract()
            await voting.vote(taskArgs.index, name, {value: correctSum})
                .then(result => printHash(result))
            console.log(` >>> Vote to ${fromBytes(taskArgs.name)} done`)
        } catch(e) {
            catchError(e)
        }
})

// npx hardhat finish --index 2
task("finish", "Finish voting by index")
    .addParam("index", "The index of voting")
    .setAction(async (taskArgs) => {
        try {
            const voting = await getContract()
            await voting.finishVote(taskArgs.index)
                .then(result => printHash(result))
            console.log(` >>> Vote ${taskArgs.index} finished`)
        } catch(e) {
            catchError(e)
        }
})

// npx hardhat withdraw --value 0.1
task("withdraw", "Withdraw free ethers")
    .addParam("value", "ETH value")
    .setAction(async (taskArgs) => {
        const value = toWei(taskArgs.value)
        console.log(` >>> Wei value: ${value}`)
        try {
            const voting = await getContract()
            await voting.withdraw(value)
                .then(result => printHash(result))
            console.log(` >>> Withdraw ${taskArgs.value} ETH success`)
        } catch(e) {
            catchError(e)
        }    
})

// npx hardhat destruct --confirmation true
task("destruct", "Destruct the contract")
    .addParam("confirmation", "true if sure")
    .setAction(async (taskArgs) => {
        if(taskArgs.confirmation != 'true') {
            console.log(` >>> Destruction rejected`)
            return
        }
        try {
            const voting = await getContract()
            await voting.destruct()
                .then(result => printHash(result))
            console.log(` >>> Contract destructed`)
        } catch(e) {
            catchError(e)
        }
})

// npx hardhat fromBytes --bytes 0x634e616d65310000000000000000000000000000000000000000000000000000
task("fromBytes", "Returns the string")
    .addParam("bytes", "The bytes32 object")
    .setAction(async (taskArgs) => {
        console.log(` >>> ${fromBytes(taskArgs.bytes)}`)
})

// npx hardhat toBytes --bytes cName1
task("toBytes", "Returns the string")
    .addParam("value", "The value to convert")
    .setAction(async (taskArgs) => {
        console.log(` >>> ${toBytes(taskArgs.value)}`)
})