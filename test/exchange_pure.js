require("dotenv").config();
const Exchange = artifacts.require("ExchangePure");
const Token = artifacts.require("Token");
const name = process.env.TOKEN_NAME;
const symbol = process.env.TOKEN_SYMBOL;
const unitsOneEthCanBuy = process.env.TOKEN_RATE;
const totalSupply = process.env.TOKEN_SUPPLY;
const etherAddress = "0x0000000000000000000000000000000000000000";
const [makerFee, takerFee, withdrawalFee] = [0, 1, 2];

contract("ExchangePure", function(accounts) {
	beforeEach(async () => {
		exchange = await Exchange.new();
		await exchange.changeFeeCollector(accounts[9]);
		token = await Token.new(name, symbol, unitsOneEthCanBuy, totalSupply);
	});

	describe("public maintenance", async () => {
		it("can change fee", async () => {
			await assertExchangeFee(withdrawalFee, 0);

			await exchange.changeFee(withdrawalFee, web3.toWei(9999));

			await assertExchangeFee(withdrawalFee, 0.05);
		});
	});

	describe("deposit", () => {
		it("can deposit ether", async () => {
			const depositWatcher = exchange.Deposit();

			await assertExchangeBalance(etherAddress, accounts[0], 0);

			await exchange.deposit(etherAddress, web3.toWei(0.5), {
				value: web3.toWei(0.5)
			});

			await assertExchangeBalance(etherAddress, accounts[0], 0.5);

			const depositEvent = depositWatcher.get()[0].args;
			assert.equal(depositEvent.token, etherAddress);
			assert.equal(depositEvent.account, accounts[0]);
			assert.equal(web3.fromWei(depositEvent.amount.toNumber()), 0.5);
		});

		it("can deposit tokens", async () => {
			const depositWatcher = exchange.Deposit();

			await assertExchangeBalance(token.address, accounts[0], 0);

			await token.approve(exchange.address, web3.toWei(100));
			await exchange.deposit(token.address, web3.toWei(0.5));

			await assertExchangeBalance(token.address, accounts[0], 0.5);

			const depositEvent = depositWatcher.get()[0].args;
			assert.equal(depositEvent.token, token.address);
			assert.equal(depositEvent.account, accounts[0]);
			assert.equal(web3.fromWei(depositEvent.amount.toNumber()), 0.5);
		});
	});

	describe("withdraw", () => {
		it.only("can withdraw", async () => {
			await token.transfer(accounts[1], web3.toWei(1));
			const withdrawWatcher = exchange.Withdraw();

			await exchange.changeFee(withdrawalFee, web3.toWei(9999));

			await token.approve(exchange.address, web3.toWei(1), {
				from: accounts[1]
			});
			await exchange.deposit(token.address, web3.toWei(1), {
				from: accounts[1]
			});

			await assertExchangeBalance(token.address, accounts[1], 1);
			await assertExchangeBalance(token.address, accounts[9], 0);

			await exchange.withdraw(token.address, web3.toWei(1), {
				from: accounts[1]
			});

			await assertExchangeBalance(token.address, accounts[1], 0);
			await assertExchangeBalance(token.address, accounts[9], 0.05);
			await assertTokenBalance(accounts[1], 0.95);

			const withdrawEvent = withdrawWatcher.get()[0].args;
			assert.equal(withdrawEvent.token, token.address);
			assert.equal(withdrawEvent.account, accounts[1]);
			assert.equal(web3.fromWei(withdrawEvent.amount.toNumber()), 1);
		});
	});
});

assertExchangeFee = async (type, value) => {
	const fee = web3.fromWei((await exchange.fees.call(type)).toNumber());
	assert.equal(fee, value);
};

assertTokenBalance = async (account, value) => {
	const balance = web3.fromWei((await token.balanceOf(account)).toNumber());
	assert.equal(balance, value);
};

assertExchangeBalance = async (token, account, expectedBalance) => {
	const balance = web3.fromWei(
		(await exchange.balances.call(token, account)).toNumber()
	);
	assert.equal(balance, expectedBalance);
};

assertExchangeBalanceAtLeast = async (token, account, expectedBalance) => {
	const balance = web3.fromWei(
		(await exchange.balances.call(token, account)).toNumber()
	);
	assert.isAtLeast(balance, expectedBalance);
};

assertFail = async (fn, ...args) => {
	try {
		assert.fail(await fn(...args));
	} catch (err) {
		assert.equal(
			err.message,
			"VM Exception while processing transaction: revert"
		);
	}
};
