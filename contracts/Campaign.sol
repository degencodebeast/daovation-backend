//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

contract Campaign {

    address public owner;
    string public campaignCID;
    uint256 public id;
    uint256 public createdAt;
    uint256 public raisedFunds;
    uint256 public target;

    struct Donors {
        string name;
        uint256 amountDonated;
    }

    mapping(address => Donors) public donors;

    Donors[] public _ALL_DONORS;

    constructor(
        address _owner,
        string memory _campaignCID,
        uint256 _createdAt,
        uint256 _target,
        uint256 _id
    ) {
        owner = _owner;
        campaignCID = _campaignCID;
        createdAt = _createdAt;
        target = _target;
        id = _id;
    }

    function donate(string memory _name) public payable returns (bool) {
        require(msg.value > 0, "You cannot donate below 0");
        uint256 donation = msg.value;
        raisedFunds += donation;
        Donors storage donor = donors[msg.sender];
        donor.name = _name;
        donor.amountDonated = msg.value;
        _ALL_DONORS.push(donor);
        return true;
    }
    
    function claim() public payable {
        require(msg.sender == owner);
        (bool success, ) = payable(owner).call{value: address(this).balance}("");
        require(success, "Failed to claim");
    }

    receive() external payable {
        // Handle the received Ether here
    }
    
}
