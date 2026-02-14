# STX Harvest Contract Functions

https://stx-harvest.thepandemonium.app

## Main Functions (What Users Can Do)

### harvest
**What it does:** This is where you harvest your NFT to get some STX back

**How it works:**
- You pay a small fee in STX
- You transfer your NFT to the contract
- The contract immediately sends you back a portion of your fee as a refund

**Example:** You pay 1 STX fee and send your NFT. You get 0.01 STX back

---

## Admin Functions (Only admins Can Use These)

### withdraw-stx
**What it does:** Lets admins take STX out of the contract

**How it works:**
- Admins can take out a specific amount of STX
- They choose how much and where to send it
- The contract keeps track of the withdrawal for transparency

### set-fee-amounts
**What it does:** Changes how much users pay and how much they get back

**How it works:**
- Admins can update the fee amount (what users pay)
- Admins can update the refund amount (what users get back)
- The fee must always be higher than the refund

### approve-nft-contract
**What it does:** Adds an NFT collection to the approved list

**How it works:**
- Only NFTs from approved collections can be harvested
- Admins can approve or unapprove any NFT collection
- This protects users from sending incompatible NFTss

### remove-nft-contract
**What it does:** Completely removes an NFT collection from the approved list

**How it works:**
- Similar to unapproving but completely removes the record
- Admins use this to clean up the approved list

### recover-nft
**What it does:** Gets NFTs that are stuck in the contract

**How it works:**
- If an NFT needs to be rescued then admins can send it to a specific address
- This is a safety feature for edge cases

### add-admin
**What it does:** Gives someone administrator permissions

**How it works:**
- Only the contract owner can add new admins
- New admins can then perform admin-only functions

### remove-admin
**What it does:** Removes administrator permissions from someone

**How it works:**
- Only the contract owner can remove admins
- The owner themselves cannot be removed

### set-contract-paused
**What it does:** Temporarily stops the contract from working

**How it works:**
- Admins can pause the contract in case of emergency
- When paused, users cannot harvest NFTs
- Admins can unpause to resume normal operations

---

## Information Functions (Anyone Can Check These)

### check-is-admin
**What it does:** Checks if someone is an admin

**How it works:**
- Give it a wallet address
- It tells you yes or no if that person is an admin

### is-nft-approved
**What it does:** Checks if an NFT collection is approved for harvesting

**How it works:**
- Give it an NFT collection address
- It tells you yes or no if it's approved

### get-nft-contract-status
**What it does:** Gets detailed approval status for an NFT collection

**How it works:**
- Similar to checking approval but gives more details

### get-contract-balance
**What it does:** Shows how much STX the contract has

**How it works:**
- Returns the total amount of STX in the contract
- Useful for knowing when withdrawals are needed

### get-fee-info
**What it does:** Shows the current fee structure

**How it works:**
- Returns three numbers:
  - **Fee:** What users pay to harvest
  - **Refund:** What users get back
  - **Net Cost:** The difference (what it actually costs)

### is-contract-paused
**What it does:** Checks if the contract is paused

**How it works:**
- Returns yes if paused or no if running normally
- Users can check this before trying to harvest

---

## Summary

**For Regular Users:**
- User use the `harvest` function to exchange your NFT for a small STX refund
- User can check fees and contract status and approved NFTs before harvesting

**For admins:**
- Admins manage which NFTs are allowed
- Admins set the fees and refunds
- Admins can withdraw collected fees
- Admins can pause the contract if needed
- Admins can recover stuck NFTs

**For the Owner:**
- Owner have all admin powers

**Note:** All funds and NFTs are stored inside the contract itself. They are not stored in the deployer's personal wallet address
