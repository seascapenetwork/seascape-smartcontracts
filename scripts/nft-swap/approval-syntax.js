// run this script for each user, when they want to create offer

let approvedForAllTokens = new Array();
for(index = 0; index < offeredTokensAmount; index++){
  if(!approvedForAllTokens.includes(offeredToken[index].address)){
		let isApprovedForAll = await offeredToken[index].address.isApprovedForAll(msg.sender, nftSwap.address);
    if(isApprovedForAll){
		  approvedForAllTokens.push(offeredToken[index].address);
    } else {
      let isApproved = await offeredToken[index].address.getApproved(offeredToken[index].tokenId);
	    if(isApproved != nftSwap.address){
        await offeredToken[index].address.setApprovalForAll(nftSwap.address, true, {from: msg.sender});
        isApprovedForAll = await offeredToken[index].address.isApprovedForAll(msg.sender, nftSwap.address);
			  if(isApprovedForAll)
          approvedForAllTokens.push(offeredToken[index].address);
        else
          throw 'Could not approve the tokens';
      }
    }
  }
}
