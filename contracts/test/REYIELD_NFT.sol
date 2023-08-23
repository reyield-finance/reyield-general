// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract REYIELD_NFT is ERC721, ERC721Burnable, ERC721Enumerable, ERC721URIStorage, Ownable {
    using Strings for uint256;
    using SafeMath for uint256;

    uint256 public cost = 0 ether;
    uint256 public maxSupply = 1000;
    uint256 public maxMintAmount = 1;
    uint256 public nftPerAddressLimit = 1;
    uint256 public nowSupply;
    string public baseURI;
    string public baseExtension = ".json";
    bool public onlyWhitelisted = true;
    bool public saleIsActive = false;

    bytes32 public merkleRoot;

    uint256 public startTimestamp;

    // 避免轉移nft繼續mint
    mapping(address => bool) public isMintedWhitelist;

    mapping(address => uint256) public presaleAddressMintedBalance;

    constructor(string memory _initBaseURI) ERC721("REYIELD Finance", "REYIELD") {
        setBaseURI(_initBaseURI);
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721Enumerable, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function mint() public payable mintingOpen {
        require(saleIsActive, "the sale is not active");
        require(nowSupply < maxSupply, "max NFT limit exceeded");
        require(msg.value >= cost, "insufficient funds");
        nowSupply++;
        _safeMint(msg.sender, nowSupply);
    }

    function mintWhitelist(bytes32[] calldata _merkleProof) public payable {
        require(onlyWhitelisted == true);
        require(nowSupply < maxSupply, "max NFT limit exceeded");
        require(!saleIsActive, "the sale is not active");

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(MerkleProof.verify(_merkleProof, merkleRoot, leaf), "Invalid proof.");
        require(!isMintedWhitelist[msg.sender], "Minted already");
        isMintedWhitelist[msg.sender] = true;
        nowSupply++;
        _safeMint(msg.sender, nowSupply);
    }

    function walletOfOwner(address _owner) public view returns (uint256[] memory) {
        uint256 ownerTokenCount = balanceOf(_owner);
        uint256[] memory tokenIds = new uint256[](ownerTokenCount);
        for (uint256 i; i < ownerTokenCount; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(_owner, i);
        }
        return tokenIds;
    }

    function tokenURI(uint256 tokenId) public view virtual override(ERC721, ERC721URIStorage) returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        string memory currentBaseURI = _baseURI();
        return
            bytes(currentBaseURI).length > 0
                ? string(abi.encodePacked(currentBaseURI, tokenId.toString(), baseExtension))
                : "";
    }

    function mintOwner(uint256 _mintAmount) public onlyOwner {
        require(_mintAmount > 0, "need to mint at least 1 NFT");
        require(nowSupply + _mintAmount <= maxSupply, "max NFT limit exceeded");
        for (uint256 i = 1; i <= _mintAmount; i++) {
            nowSupply++;
            _safeMint(msg.sender, nowSupply);
        }
    }

    function airdrop(address[] memory _addresses) public onlyOwner {
        require(_addresses.length > 0, "need to mint at least 1 NFT");
        require(nowSupply + _addresses.length <= maxSupply, "max NFT limit exceeded");
        for (uint256 i = 0; i < _addresses.length; i++) {
            nowSupply++;
            _safeMint(_addresses[i], nowSupply);
        }
    }

    function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        require(merkleRoot != _merkleRoot, "Err: same merkleRoot");
        merkleRoot = _merkleRoot;
    }

    function setNftPerAddressLimit(uint256 _limit) public onlyOwner {
        nftPerAddressLimit = _limit;
    }

    function setCost(uint256 _newCost) public onlyOwner {
        cost = _newCost;
    }

    function setmaxMintAmount(uint256 _newmaxMintAmount) public onlyOwner {
        maxMintAmount = _newmaxMintAmount;
    }

    function setBaseURI(string memory _newBaseURI) public onlyOwner {
        baseURI = _newBaseURI;
    }

    function setBaseExtension(string memory _newBaseExtension) public onlyOwner {
        baseExtension = _newBaseExtension;
    }

    function setSaleState(bool _state) public onlyOwner {
        saleIsActive = _state;
    }

    function setOnlyWhitelisted(bool _state) public onlyOwner {
        onlyWhitelisted = _state;
    }

    function withdraw() public payable onlyOwner {
        (bool os, ) = payable(owner()).call{ value: address(this).balance }("");
        require(os);
    }

    function setStartTimestamp(uint256 _startTimestamp) external onlyOwner {
        startTimestamp = _startTimestamp;
    }

    modifier mintingOpen() {
        require(startTimestamp != 0, "Start timestamp not set");
        require(block.timestamp >= startTimestamp, "Not open yet");
        _;
    }
}
