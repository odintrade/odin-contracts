pragma solidity ^0.4.22;

import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol';
import "./lib/RedBlackTree.sol";

contract ExchangePure {
	using SafeMath for uint;

	enum Fee {
		Maker,
		Taker,
		Withdrawal
	}

	struct Balance {
		uint available;
		uint reserved;
	}

  address public owner;
  address public feeCollector;

  mapping (address => mapping (address => Balance)) public balances;
  mapping (uint => uint) public fees;

  event Deposit(address token, address user, uint amount, uint balance);
	event Withdraw(address token, address user, uint amount, uint balance);

	modifier ownerOnly {
		require(msg.sender == owner);
		_;
	}

	constructor() public {
		owner = msg.sender;
		feeCollector = msg.sender;
	}

	function changeFeeCollector(address _feeCollector) public ownerOnly {
		feeCollector = _feeCollector;
	}

	function changeFee(uint _type, uint _value) public {
		if (_value > 50 finney) _value = 50 finney;
		fees[_type] = _value;
	}

	function changeOwner(address _owner) public ownerOnly {
		owner = _owner;
	}

	function deposit(address _token, uint _amount) public payable {
		if (_token == 0) {
			require(msg.value == _amount);
			balances[0][msg.sender].available = balances[0][msg.sender].available.add(msg.value);
    } else {
			require(msg.value == 0);
			balances[_token][msg.sender].available = balances[_token][msg.sender].available.add(_amount);
			require(StandardToken(_token).transferFrom(msg.sender, this, _amount));
    }
    emit Deposit(_token, msg.sender, _amount, balances[_token][msg.sender].available);
	}

	function withdraw(address _token, uint _amount) public {
		require(balances[_token][msg.sender].available >= _amount);
    balances[_token][msg.sender].available = balances[_token][msg.sender].available.sub(_amount);
    uint fee = (fees[uint(Fee.Withdrawal)].mul(_amount)).div(1 ether);
    balances[_token][feeCollector].available = balances[_token][feeCollector].available.add(fee);
    if (_token == 0) {
      require(msg.sender.send(_amount.sub(fee)));
    } else {
      require(StandardToken(_token).transfer(msg.sender, _amount.sub(fee)));
    }
    emit Withdraw(_token, msg.sender, _amount, balances[_token][msg.sender].available);
	}

	function getBalance(address _token, address _user) public view returns(uint available, uint reserved) {
		available = balances[_token][_user].available;
    reserved = balances[_token][_user].reserved;
	}

	// function placeOrder() public {}

	// function cancelOrder() public {}

	// function getOrderBook() public {}

	// getOrder() public {}

	// function matchOrder() private {}

	// function trade() private {}
}

