const { expect } = require("chai")
const { ethers } = require("hardhat")

async function runTests() {

  let voting
  let deployTime
  const correctSum = "" + 1e17
  const voteDuration = 3  // time for test
  const sleepingTime = voteDuration * 1000
  const accs = await ethers.getSigners()
  const owner = accs[0]

  const cnd1 = {
    "name": toBytes('name1'),
    "acc": accs[17]
  }
  const cnd2 = {
    "name": toBytes('name2'),
    "acc": accs[18]
  }
  const cnd3 = {
    "name": toBytes('name3'),
    "acc": accs[19]
  }
  const voter1 = accs[1]

  const _ = undefined

  function vote(_acc=voter1, _voteIndex=1, _cndName=cnd1.name, _sum=correctSum) {
  
    return voting.connect(_acc).vote(
      _voteIndex,
      _cndName,
      { value: _sum }
    )
  }

  async function a_vote(_acc=voter1, _voteIndex=1, _cndName=cnd1.name, _sum=correctSum) {

    return await voting.connect(_acc).vote(
      _voteIndex,
      _cndName,
      { value: _sum }
    )
  }

  function addVote(_acc=owner, _voteIndex=1, 
    _addresses=[cnd1.acc.address, cnd2.acc.address], _names=[cnd1.name, cnd2.name]) {
      
    return voting.connect(_acc).addVote(
      _voteIndex,
      _addresses,
      _names
    )
  }

  async function a_addVote(_acc=owner, _voteIndex=1, 
    _addresses=[cnd1.acc.address, cnd2.acc.address], _names=[cnd1.name, cnd2.name]) {

    return await voting.connect(_acc).addVote(
      _voteIndex,
      _addresses,
      _names
    )
  }

  function sleep(timeout) {
    return new Promise(resolve => setTimeout(resolve, timeout));
  }
  
  function toBytes(_string) {
    return ethers.utils.formatBytes32String(_string)
  }
  
  describe("step1", async () => {
  
    beforeEach(async function() {
      const _voting = await ethers.getContractFactory("CryptonVoting", owner)
      voting = await _voting.deploy(10)
      await voting.deployed()
    })
  
    it("SHOULD BE SUCCESS  | deploy with correct address", async function() {
      expect(voting.address)
        .to.be.properAddress
    })
  
    it("SHOULD BE SUCCESS  | 0 ether by default", async function() {
      const balance = await voting.getBalance()
      expect(balance).to.eq(0)  
    })
    
    it("SHOULD BE SUCCESS  | 0 free balance on contract", async function() {
      const freeBalance = await voting.connect(owner).getFreeBalance()
      expect(freeBalance).to.be.eq(0)
    })

    it("SHOULD BE REVERTED | no such voting", async function() {
      await expect(vote())
        .to.be.revertedWith('No such voting!')
    })
  
    it("SHOULD BE REVERTED | create voting without arguments", async function() {
      await expect(voting.connect(owner).addVote())
        .to.be.reverted;
    })
  
    it("SHOULD BE REVERTED | not owner create voting", async function() {
      await expect(addVote(voter1))
        .to.be.revertedWith('You are not an owner!')
    })
  
    it("SHOULD BE REVERTED | null vote index", async function() {
      await expect(addVote(_, 0))
        .to.be.revertedWith('Enter the index of the vote! Index cant be null!')
    })
  
    it("SHOULD BE REVERTED | incorrect input length", async function() {
      await expect(addVote(_, _, _addresses=[cnd1.acc.address, cnd2.acc.address, cnd3.acc.address]))
        .to.be.revertedWith('Arrays must be the same length!')
    })
  
    it("SHOULD BE REVERTED | incorrect input", async function() {
      await expect(addVote(_, _, _addresses=[cnd1.acc.address], _names=[cnd1.name]))
        .to.be.revertedWith('Must have at least two candidates!')
    })
  
    it("SHOULD BE SUCCESS  | create voting ignore copyes", async function() {
      await a_addVote(_, _, _addresses=[cnd1.acc.address, cnd2.acc.address, cnd2.acc.address], 
        _names=[cnd1.name, cnd2.name, cnd2.name])
  
      const result = await voting.connect(voter1).getVotingCandidates(1)
      expect(
        result[0].candidateAddress, 
        result[0].votesCount,
        result[1].candidateAddress, 
        result[1].votesCount
      ).to.be.eq(
        cnd1.acc.address,
        0,
        cnd2.acc.address,
        0
      )
    })
  
    it("SHOULD BE SUCCESS  | create voting", async function() {
      await a_addVote()
  
      const result = await voting.connect(voter1).getCandidate(
        1, cnd1.name
      )
      expect(result[0], result[1].value).to.be.eq(cnd1.acc.address, 0)
    })
  }) 
  
  describe("step2", async () => {
    
    beforeEach(async function() {
      const _voting = await ethers.getContractFactory("CryptonVoting", owner)
      voting = await _voting.deploy(voteDuration)
      deployTime = (await ethers.provider.getBlock()).timestamp
      await voting.deployed()
      await a_addVote()
    })
  
    it("SHOULD BE REVERTED | vote index is taken", async function() {
      await expect(addVote())
        .to.be.revertedWith('This index is taken!')
    })
  
    it("SHOULD BE REVERTED | vote for yourself", async function() {
      await expect(vote(cnd1.acc))
        .to.be.revertedWith('You cant vote for yourself!')
    })
  
    it("SHOULD BE REVERTED | incorrect vote price", async function() {
      await expect(vote(_, _, _, 1e15))
        .to.be.revertedWith('The value does not match the prise of voting!')
    })
  
    it("SHOULD BE SUCCESS  | vote change balances", async function() {
      const tx = a_vote()
      await expect(() => tx)
        .to.changeEtherBalances([voter1, voting], ["-" + correctSum, correctSum])
    })
  
    it("SHOULD BE REVERTED | not owner try check free balance", async function() {
      await expect(voting.connect(voter1).getFreeBalance())
        .to.be.revertedWith('You are not an owner!')
    })
  
    it("SHOULD BE REVERTED | cant finish voting yet", async function() {
      await expect(voting.connect(voter1).finishVote(1))
        .to.be.revertedWith('Cant finish voting yet!')
    })
  
    it("SHOULD BE SUCCESS  | no default winners", async function() {
      const result = await voting.connect(voter1).getWinners(1)
      expect(result[0]).to.be.eq(undefined);
    })
  
    it("SHOULD BE SUCCESS  | return candidates by vote", async function() {
      const result = await voting.connect(voter1).getVotingCandidates(1)
      expect(
        result[0].candidateAddress, 
        result[0].votesCount,
        result[1].candidateAddress, 
        result[1].votesCount
      ).to.be.eq(
        cnd1.acc.address,
        0,
        cnd2.acc.address,
        0
      )
    })
  
    it("SHOULD BE SUCCESS  | return candidate by name", async function() {
      const result = await voting.connect(voter1).getCandidate(1, cnd1.name)
      expect(
        result.candidateAddress, 
        result.votesCount
      ).to.be.eq(
        cnd1.acc.address,
        0
      )
    })
  
    it("SHOULD BE SUCCESS  | check non-existing voting", async function() { 
      const result = await voting.connect(voter1).checkVoting(0)
      expect(result).to.be.eq(false);
    })
  
    it("SHOULD BE SUCCESS  | check existing voting", async function() {
      const result = await voting.connect(voter1).checkVoting(1)
      expect(result).to.be.eq(true);
    })
  
    it("SHOULD BE SUCCESS  | check person not vote", async function() {
      const result = await voting.connect(voter1).checkVote(1, voter1.address)
      expect(result).to.be.eq(false);
    })
  
    it("SHOULD BE REVERTED | person already vote", async function() {
      await a_vote()
      await expect(vote())
        .to.be.revertedWith('You have already voted!')
    })
  
    it("SHOULD BE SUCCESS  | check non-existing candidate", async function() { 
      const result = await voting.connect(voter1).checkCandidate(1, cnd3.name)
      expect(result).to.be.eq(false)
    })
  
    it("SHOULD BE SUCCESS  | return current time", async function() {
      const result = await voting.connect(voter1).currentTime()
      const _time = (await ethers.provider.getBlock()).timestamp
      expect(result).to.be.eq(_time)
    })
  
    it("SHOULD BE SUCCESS  | return voting time left", async function() {
      const _time = (await ethers.provider.getBlock()).timestamp
      const result = await voting.connect(voter1).getTimeLeft(1)
      expect(result).to.be.eq(deployTime - _time + voteDuration + 1)
    })
  
    it("SHOULD BE SUCCESS  | voting finish without winners", async function() {
      await sleep(sleepingTime)

      await voting.connect(voter1).finishVote(1)
    })
  
    it("SHOULD BE REVERTED | try finish non-existing voting", async function() {
      await expect(voting.connect(voter1).finishVote(2)).
        to.be.revertedWith("Cant finish voting yet!")
    })
  
    it("SHOULD BE REVERTED | try finish voting again", async function() {
      await sleep(sleepingTime)

      await voting.connect(voter1).finishVote(1)
      await expect(voting.connect(voter1).finishVote(1)).
        to.be.revertedWith("Cant finish voting yet!")
    })
  
    it("SHOULD BE SUCCESS  | finish voting with winners", async function() {
      await a_vote()
    
      const result = await voting.connect(voter1).getWinners(1)
      expect(result[0]).to.be.eq(cnd1.acc.address);
  
      const result1 = await voting.connect(voter1).getCandidate(1, cnd1.name)
      expect(
        result1.candidateAddress, 
        result1.votesCount
      ).to.be.eq(
        cnd1.acc.address,
        1
      )
      await sleep(sleepingTime)

      const tx = await voting.connect(voter1).finishVote(1)
      await expect(() => tx)
        .to.changeEtherBalances([voting, cnd1.acc], ["-" + 1e17*0.9, "" + 1e17*0.9])
    })
  
    it("SHOULD BE REVERTED | try withdraw out of free balance", async function() {
      await a_vote()
      await sleep(sleepingTime)

      await voting.connect(voter1).finishVote(1)
      await expect(voting.connect(owner).withdraw("" + 1e18))
        .to.be.revertedWith("Value is out of free balance!")
    })
  
    it("SHOULD BE SUCCESS  | withdraw free balance", async function() {
      await a_vote()
      await sleep(sleepingTime)

      await voting.connect(voter1).finishVote(1)
      const tx = await voting.connect(owner).withdraw("" + 1e16)
      await expect(() => tx)
        .to.changeEtherBalances([voting, owner], ["-" + 1e16, "" + 1e16]);
    })
  
    it("SHOULD BE REVERTED | try withdraw null value", async function() {
      await expect(voting.connect(owner).withdraw(0))
        .to.be.revertedWith("Cant withdraw null value!")
    })
  
    it("SHOULD BE REVERTED | try vote to non-existent candidate", async function() {
      await expect(vote(_, _, cnd3.name))
        .to.be.revertedWith("No such candidate!")
    })
  
    it("SHOULD BE REVERTED | try vote in finished voting", async function() {
      await sleep(sleepingTime)
      await expect(vote())
        .to.be.revertedWith("This vote is over!")
    })
  
    it("SHOULD BE SUCCESS  | approve Transfer event", async function() {
      await a_vote()
      await sleep(sleepingTime)

      await voting.connect(voter1).finishVote(1)
      await expect(voting.connect(owner).withdraw("" + 1e16))
        .to.emit(voting, "Transfer")
        .withArgs(owner.address, "" + 1e16)
    })

    it("SHOULD BE SUCCESS  | destruct the contract", async function() {
      await voting.connect(owner).destruct()
      await expect(voting.connect(voter1).currentTime()).to.be.reverted
    })
  })
}

runTests()
