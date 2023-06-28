//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;


//import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Campaign {

    bool private _locked;

    address public owner;
    string public campaignCID;
    uint256 public id;
    uint256 public createdAt;
    uint256 public raisedFunds;
    uint256 public target;

    // struct Donors {
    //     string name;
    //     uint256 amountDonated;
    // }

    // mapping(address => Donors) public donors;

    // Donors[] public _ALL_DONORS;

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


    function withdraw(uint256 amount) external {
        // require(!_locked, "Reentrancy guard: reentrant call");
        // _locked = true;

        require(owner == tx.origin, "you are not the owner");
        require(amount <= address(this).balance, "Insufficient balance");
        payable(owner).transfer(amount);

        //_locked = false;
    }

    receive() external payable {
        // Handle the received Ether here
    }
}
