//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;


// contract for Crypton by ilkatel
contract CryptonVoting {

    event Transfer(address indexed _to, uint _value);
    event Winner(uint indexed _voteIndex, address indexed _winnerAddress, uint _prize);

    struct Candidate {
        address candidateAddress;
        uint votesCount;
    }

    struct votingProcess {
        mapping(address => bytes32) voters;
        mapping(bytes32 => Candidate) candidates;
        bytes32[] candidatesNames;
        uint votesCount;
        uint finishTimestamp;
        bool status;  // true if voting in progress; false if voting finished or non-existent
    }
    
    mapping(uint => votingProcess) private vp;
    uint public voteDuration; // 259_200;  // 3 * 24 * 60 * 60
    uint public votePrice = 1e17;  // 0.1 ETH
    uint public comission = 10;  // 10%
    uint private freeBalance;  // balance that can be withdrawn by the owner
    address private owner;
    

    constructor(uint _voteDuration) {
        owner = msg.sender;
        voteDuration = _voteDuration;
    }
    

    modifier isOwner {
        require(msg.sender == owner, "You are not an owner!");
        _;
    }

    modifier canVote(uint _voteIndex, bytes32 _candidateName) {
        require(checkVoting(_voteIndex), "No such voting!");
        require(!checkFinishVoting(_voteIndex), "This vote is over!");
        require(checkCandidate(_voteIndex, _candidateName), "No such candidate!");
        require(msg.sender != vp[_voteIndex].candidates[_candidateName].candidateAddress, "You cant vote for yourself!");
        require(!checkVote(_voteIndex, msg.sender), "You have already voted!");
        require(msg.value == votePrice, "The value does not match the prise of voting!");
        _;
    }

    function addVote(uint _voteIndex, address[] memory _candidatesAddresses, bytes32[] memory _candidatesNames) external isOwner {
        require(_voteIndex != 0, "Enter the index of the vote! Index cant be null!");
        require(!checkVoting(_voteIndex), "This index is taken!");
        require(_candidatesAddresses.length > 1, "Must have at least two candidates!");
        require(_candidatesAddresses.length == _candidatesNames.length, "Arrays must be the same length!");

        for (uint i = 0; i < _candidatesAddresses.length; i++) {
            if (!checkCandidate(_voteIndex, _candidatesNames[i])) {  // ingore duplicates
                vp[_voteIndex].candidates[_candidatesNames[i]].candidateAddress = _candidatesAddresses[i];
                vp[_voteIndex].candidatesNames.push(_candidatesNames[i]);
            }
        }
        vp[_voteIndex].status = true;
        vp[_voteIndex].finishTimestamp = currentTime() + voteDuration;
    }

    function vote(uint _voteIndex, bytes32 _candidateName) payable external canVote (_voteIndex, _candidateName) {
        vp[_voteIndex].candidates[_candidateName].votesCount++;
        vp[_voteIndex].voters[msg.sender] = _candidateName;
        vp[_voteIndex].votesCount++;
    }

    function currentTime() public view returns (uint) {
        return block.timestamp;
    }
    
    function checkVoting(uint _voteIndex) public view returns (bool) {
        if (vp[_voteIndex].finishTimestamp == 0)
            return false;
        return true;
    }

    function checkVote(uint _voteIndex, address _address) public view returns (bool) {
        if (vp[_voteIndex].voters[_address] == 0)
            return false;
        return true;
    }

    function checkCandidate(uint _voteIndex, bytes32 _candidateName) public view returns (bool) {
        if (vp[_voteIndex].candidates[_candidateName].candidateAddress == address(0))
            return false;
        return true;
    }

    function getCandidate(uint _voteIndex, bytes32 _candidateName) public view returns (Candidate memory) {
        return vp[_voteIndex].candidates[_candidateName];
    }

    function getVotingCandidates(uint _voteIndex) public view returns (Candidate[] memory _candidates) {
        _candidates = new Candidate[](vp[_voteIndex].candidatesNames.length);
        for (uint i = 0; i < vp[_voteIndex].candidatesNames.length; i++)
            _candidates[i] = vp[_voteIndex].candidates[vp[_voteIndex].candidatesNames[i]];
    }

    function withdraw(uint _value) public isOwner {
        require(_value <= freeBalance, "Value is out of free balance!");
        require(_value != 0, "Cant withdraw null value!");
        payable(owner).transfer(_value);
        emit Transfer(owner, _value);
    }

    // looking at multiple winners
    function winners(uint _voteIndex) public view returns (address[] memory _winners) {
        uint _votes;
        uint _count = 1;  // counting the number of winners
        for (uint i = 0; i < vp[_voteIndex].candidatesNames.length; i++) {
            uint _v = vp[_voteIndex].candidates[vp[_voteIndex].candidatesNames[i]].votesCount;
            if (_v > _votes) {
                _votes = _v;
                _count = 1;
            }
            else if (_v == _votes)
                _count++;
        }

        if (_votes > 0) { // if winners exist
            _winners = new address[](_count);
            uint _index;
            for (uint i = 0; i < vp[_voteIndex].candidatesNames.length; i++) {
                if (vp[_voteIndex].candidates[vp[_voteIndex].candidatesNames[i]].votesCount == _votes) {
                    _winners[_index] = vp[_voteIndex].candidates[vp[_voteIndex].candidatesNames[i]].candidateAddress;
                    _index++;
                }
            }
        }
        // if no winners return []
    }

    function getWinners(uint _voteIndex) public view returns (address[] memory) {
        return winners(_voteIndex);
    }

    function checkFinishVoting(uint _voteIndex) public returns (bool) {
        if (vp[_voteIndex].finishTimestamp > currentTime())
            return false;
        if (!vp[_voteIndex].status)
            return false;
        
        vp[_voteIndex].status = false;
        address[] memory _winners = winners(_voteIndex);
        if (_winners.length == 0)
            return true;
            
        uint winnersPrize = vp[_voteIndex].votesCount * votePrice * (100 - comission) / (100 * _winners.length);
        for (uint i = 0; i < _winners.length; i++) {
            emit Winner(_voteIndex, _winners[i], winnersPrize);
            payable(_winners[i]).transfer(winnersPrize);
        }
        freeBalance += vp[_voteIndex].votesCount * votePrice * comission / 100;
        return true;
    }

    function finishVote(uint _voteIndex) public {
        require(checkFinishVoting(_voteIndex), "Cant finish voting yet!");
    }

    function getBalance() public view returns (uint) {
        return address(this).balance;
    }

    function getFreeBalance() public view isOwner returns (uint) {
        return freeBalance;
    }

    function getTimeLeft(uint _voteIndex) public view returns (int) {
        return int(vp[_voteIndex].finishTimestamp - currentTime());
    }

    function destruct() public isOwner {
        selfdestruct(payable(owner));
    }
}
