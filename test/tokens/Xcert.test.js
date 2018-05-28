const Xcert = artifacts.require('Xcert');
const util = require('ethjs-util');
const web3Util = require('web3-utils');
const assertRevert = require('../../node_modules/@0xcert/ethereum-erc721/test/helpers/assertRevert');
const TokenReceiverMock = artifacts.require('NFTokenReceiverMock');

contract('Xcert', (accounts) => {
  let xcert;
  const id1 = web3.sha3('test1');
  const id2 = web3.sha3('test2');
  const id3 = web3.sha3('test3');
  const id4 = web3.sha3('test4');
  const proof = '1e205550c271490347e5e2393a02e94d284bbe9903f023ba098355b8d75974c8';
  const config = [web3Util.padLeft(web3Util.numberToHex(1821195657), 64)];
  const data = [];

  beforeEach(async function () {
    xcert = await Xcert.new('Foo', 'F', '0xa65de9e6');
  });

  it('returns correct convention', async () => {
    const convention = await xcert.conventionId();
    assert.equal(convention, '0xa65de9e6');
  });

  it('returns correct balanceOf after mint', async () => {
    await xcert.mint(accounts[0], id1, 'url', proof, config, data);
    const count = await xcert.balanceOf(accounts[0]);
    assert.equal(count.toNumber(), 1);
  });

  it('throws when trying to mint 2 NFTs with the same claim', async () => {
    await xcert.mint(accounts[0], id2, 'url2', proof, config, data);
    await assertRevert(xcert.mint(accounts[0], id2, 'url2', proof, config, data));
  });

  it('throws trying to mint NFT with empty claim', async () => {
    await assertRevert(xcert.mint(accounts[0], '', '', proof, config, data));
  });

  it('throws trying to mint NFT with empty config', async () => {
    await assertRevert(xcert.mint(accounts[0], id3, 'url3', proof, [], data));
  });

  it('throws when trying to mint NFT to 0x0 address ', async () => {
    await assertRevert(xcert.mint('0', id3, 'url3', proof, config, data));
  });

  it('throws when trying to mint NFT from non owner ot authorized address', async () => {
    await assertRevert(xcert.mint('0', id3, 'url3', proof, config, data, { from: accounts[1] }));
  });

  it('correctly authotizes address for minting', async () => {
    var { logs } = await xcert.setMintAuthorizedAddress(accounts[1], true);
    let mintAuthorizedAddressEvent = logs.find(e => e.event === 'MintAuthorizedAddress');
    assert.notEqual(mintAuthorizedAddressEvent, undefined);
  });

  it('throws when someone else then the owner tries to authotize address ', async () => {
    await assertRevert(xcert.setMintAuthorizedAddress(accounts[1], true, {from: accounts[2]}));
  });

  it('throws when trying to authorize zero address', async () => {
    await assertRevert(xcert.setMintAuthorizedAddress('0', true));
  });

  it('correctly mints new NFT by authorized address', async () => {
    var authorized = accounts[1];
    var recipient = accounts[2];
    await xcert.setMintAuthorizedAddress(authorized, true);
    await xcert.mint(recipient, id3, 'url3', proof, config, data, {from: authorized});

    const count = await xcert.balanceOf(recipient);
    assert.equal(count.toNumber(), 1);
  });

  it('throws trying to ming from address which authorization got revoked', async () => {
    var authorized = accounts[1];
    var recipient = accounts[2];
    await xcert.setMintAuthorizedAddress(authorized, true);
    await xcert.setMintAuthorizedAddress(authorized, false);
    await assertRevert(xcert.mint(recipient, id3, 'url3', proof, config, data, {from: authorized}));
  });

  it('finds the correct amount of NFTs owned by account', async () => {
    await xcert.mint(accounts[1], id2, 'url2', proof, config, data);
    await xcert.mint(accounts[1], id3, 'url3', proof, config, data);
    const count = await xcert.balanceOf(accounts[1]);
    assert.equal(count.toNumber(), 2);
  });

  it('throws when trying to get count of NFTs owned by 0x0 address', async () => {
    await assertRevert(xcert.balanceOf('0'));
  });

  it('finds the correct owner of NFT id', async () => {
    await xcert.mint(accounts[1], id2, 'url2', proof, config, data);
    const address = await xcert.ownerOf(id2);
    assert.equal(address, accounts[1]);
  });

  it('throws when trying to find owner od non-existing NFT id', async () => {
    await assertRevert(xcert.ownerOf(id4));
  });

  it('correctly approves account', async () => {
    await xcert.mint(accounts[0], id2, 'url2', proof, config, data);
    await xcert.approve(accounts[1], id2);
    const address = await xcert.getApproved(id2);
    assert.equal(address, accounts[1]);
  });

  it('correctly cancels approval of account[1]', async () => {
    await xcert.mint(accounts[0], id2, 'url2', proof, config, data);
    await xcert.approve(accounts[1], id2);
    await xcert.approve(0, id2);
    const address = await xcert.getApproved(id2);
    assert.equal(address, 0);
  });

  it('throws when trying to get approval of non-existing NFT id', async () => {
    await assertRevert(xcert.getApproved(id4));
  });


  it('throws when trying to approve NFT id that we are not the owner of', async () => {
    await xcert.mint(accounts[1], id2, 'url2', proof, config, data);
    await assertRevert(xcert.approve(accounts[1], id2));
    const address = await xcert.getApproved(id2);
    assert.equal(address, 0);
  });

  it('correctly sets an operator', async () => {
    var { logs } = await xcert.setApprovalForAll(accounts[6], true);
    let approvalForAllEvent = logs.find(e => e.event === 'ApprovalForAll');
    assert.notEqual(approvalForAllEvent, undefined);

    var isApprovedForAll = await xcert.isApprovedForAll(accounts[0], accounts[6]);
    assert.equal(isApprovedForAll, true);
  });

  it('correctly sets than cancels an operator', async () => {
    await xcert.setApprovalForAll(accounts[6], true);
    await xcert.setApprovalForAll(accounts[6], false);

    var isApprovedForAll = await xcert.isApprovedForAll(accounts[0], accounts[6]);
    assert.equal(isApprovedForAll, false);
  });

  it('throws when trying to set a zero address as operator', async () => {
    await assertRevert(xcert.setApprovalForAll(0, true));
  });

  it('corectly transfers NFT from owner', async () => {
    var sender = accounts[1];
    var recipient = accounts[2];

    await xcert.mint(sender, id2, 'url2', proof, config, data);
    var { logs } = await xcert.transferFrom(sender, recipient, id2, {from: sender});
    let transferEvent = logs.find(e => e.event === 'Transfer');
    assert.notEqual(transferEvent, undefined);

    var senderBalance = await xcert.balanceOf(sender);
    var recipientBalance = await xcert.balanceOf(recipient);
    var ownerOfId2 =  await xcert.ownerOf(id2);

    assert.equal(senderBalance, 0);
    assert.equal(recipientBalance, 1);
    assert.equal(ownerOfId2, recipient);
  });

  it('corectly transfers xcert from approved address', async () => {
    var sender = accounts[1];
    var recipient = accounts[2];
    var owner = accounts[3];

    await xcert.mint(owner, id2, 'url2', proof, config, data);
    await xcert.approve(sender, id2, {from: owner});
    var { logs } = await xcert.transferFrom(owner, recipient, id2, {from: sender});
    let transferEvent = logs.find(e => e.event === 'Transfer');
    assert.notEqual(transferEvent, undefined);

    var ownerBalance = await xcert.balanceOf(owner);
    var recipientBalance = await xcert.balanceOf(recipient);
    var ownerOfId2 =  await xcert.ownerOf(id2);

    assert.equal(ownerBalance, 0);
    assert.equal(recipientBalance, 1);
    assert.equal(ownerOfId2, recipient);
  });

  it('corectly transfers NFT as operator', async () => {
    var sender = accounts[1];
    var recipient = accounts[2];
    var owner = accounts[3];

    await xcert.mint(owner, id2, 'url2', proof, config, data);
    await xcert.setApprovalForAll(sender, true, {from: owner});
    var { logs } = await xcert.transferFrom(owner, recipient, id2, {from: sender});
    let transferEvent = logs.find(e => e.event === 'Transfer');
    assert.notEqual(transferEvent, undefined);

    var ownerBalance = await xcert.balanceOf(owner);
    var recipientBalance = await xcert.balanceOf(recipient);
    var ownerOfId2 =  await xcert.ownerOf(id2);

    assert.equal(ownerBalance, 0);
    assert.equal(recipientBalance, 1);
    assert.equal(ownerOfId2, recipient);
  });

  it('throws when trying to transfer NFT as an address that is not owner, approved or operator', async () => {
    var sender = accounts[1];
    var recipient = accounts[2];
    var owner = accounts[3];

    await xcert.mint(owner, id2, 'url2', proof, config, data);
    await assertRevert(xcert.transferFrom(owner, recipient, id2, {from: sender}));
  });

  it('throws when trying to transfer NFT to a zero address', async () => {
    var owner = accounts[3];

    await xcert.mint(owner, id2, 'url2', proof, config, data);
    await assertRevert(xcert.transferFrom(owner, 0, id2, {from: owner}));
  });

  it('throws when trying to transfer a non valid xcert', async () => {
    var owner = accounts[3];
    var recipient = accounts[2];

    await xcert.mint(owner, id2, 'url2', proof, config, data);
    await assertRevert(xcert.transferFrom(owner, 0, id3, {from: owner}));
  });

  it('corectly safe transfers NFT from owner', async () => {
    var sender = accounts[1];
    var recipient = accounts[2];

    await xcert.mint(sender, id2, 'url2', proof, config, data);
    var { logs } = await xcert.safeTransferFrom(sender, recipient, id2, {from: sender});
    let transferEvent = logs.find(e => e.event === 'Transfer');
    assert.notEqual(transferEvent, undefined);

    var senderBalance = await xcert.balanceOf(sender);
    var recipientBalance = await xcert.balanceOf(recipient);
    var ownerOfId2 =  await xcert.ownerOf(id2);

    assert.equal(senderBalance, 0);
    assert.equal(recipientBalance, 1);
    assert.equal(ownerOfId2, recipient);
  });

  it('throws when trying to safe transfers NFT from owner to a smart contract', async () => {
    var sender = accounts[1];
    var recipient = xcert.address;

    await xcert.mint(sender, id2, 'url2', proof, config, data);
    await assertRevert(xcert.safeTransferFrom(sender, recipient, id2, {from: sender}));
  });

  it('corectly safe transfers NFT from owner to smart contract that can recieve NFTs', async () => {
    var sender = accounts[1];
    var tokenReceiverMock = await TokenReceiverMock.new();
    var recipient = tokenReceiverMock.address;

    await xcert.mint(sender, id2, 'url2', proof, config, data);
    var { logs } = await xcert.safeTransferFrom(sender, recipient, id2, {from: sender});
    let transferEvent = logs.find(e => e.event === 'Transfer');
    assert.notEqual(transferEvent, undefined);

    var senderBalance = await xcert.balanceOf(sender);
    var recipientBalance = await xcert.balanceOf(recipient);
    var ownerOfId2 =  await xcert.ownerOf(id2);

    assert.equal(senderBalance, 0);
    assert.equal(recipientBalance, 1);
    assert.equal(ownerOfId2, recipient);
  });

  it('returns the correct issuer name', async () => {
    const name = await xcert.name();
    assert.equal(name, 'Foo');
  });

  it('returns the correct issuer symbol', async () => {
    const symbol = await xcert.symbol();
    assert.equal(symbol, 'F');
  });

  it('returns the correct NFT id 2 url', async () => {
    await xcert.mint(accounts[1], id2, 'url2', proof, config, data);
    const tokenURI = await xcert.tokenURI(id2);
    assert.equal(tokenURI, 'url2');
  });

  it('throws when trying to get uri of non-existing NFT id', async () => {
    await assertRevert(xcert.tokenURI(id4));
  });

  it('returns the correct proof for NFT id', async () => {
    await xcert.mint(accounts[1], id2, 'url2', proof, config, data);
    let tokenProof = await xcert.tokenProof(id2);
    assert.equal(proof, tokenProof);
  });

  it('correctly checks expiration date for NFT', async () => {
    await xcert.mint(accounts[1], id2, 'url2', proof, config, data);
    let expirationDate = await xcert.tokenExpirationDate(id2);
    assert.equal(expirationDate, config[0]);
  })

  it('correctly checks data NFT', async () => {
    await xcert.mint(accounts[1], id2, 'url2', proof, config, [web3Util.padLeft(web3Util.numberToHex(3), 64)]);
    let stage = await xcert.tokenDataValue.call(id2, 0);
    assert.equal(stage, 3);
  })

  it('reverts trying to get non-existing NFT data', async () => {
    await xcert.mint(accounts[1], id2, 'url2', proof, config, data);
    await assertRevert(xcert.tokenDataValue.call(id2, 0));
  })

  it('correctly changes NFT data', async () => {
    await xcert.mint(accounts[1], id2, 'url2', proof, config, [web3Util.padLeft(web3Util.numberToHex(3), 64)]);
    await xcert.setTokenDataValue(id2, 0, web3Util.padLeft(web3Util.numberToHex(5), 64));
    let stage = await xcert.tokenDataValue.call(id2, 0);
    assert.equal(stage, 5);
  })

  it('reverts trying to change NFT non-existing data', async () => {
    await xcert.mint(accounts[1], id2, 'url2', proof, config, data);
    await assertRevert(xcert.setTokenDataValue(id2, 0, web3Util.padLeft(web3Util.numberToHex(5), 64)));
  })
});
