// All required business logic for tribe.
import { Script, Tap, Address, Tx, Signer } from '@cmdcode/tapscript';
import { NETWORK } from '@/config/config';

// This function is used to generate a multisig address.
export function generateMultisigAddress(
  pubkeys: Array<string | number>,
  threshold: number
): string {
  // Initialize the script with the first opcode as 0.
  const script: (string | number)[] = [0];

  // For each public key, add it to the script along with the OP_CHECKSIGADD opcode.
  pubkeys.forEach((item) => {
    script.push(item, 'OP_CHECKSIGADD');
  });

  // Add the threshold and the OP_EQUAL opcode to the script.
  script.push(threshold, 'OP_EQUAL');

  // Generate a public key.
  const pubkey = 'ab'.repeat(32);

  // Encode the script.
  const sbytes = Script.encode(script);

  // Get the leaf of the Taproot tree for the encoded script.
  const tapleaf = Tap.tree.getLeaf(sbytes);

  // Get the public key for the Taproot address.
  const [tpubkey] = Tap.getPubKey(pubkey, { target: tapleaf });

  // Generate the P2TR (Pay-to-Taproot) address from the public key.
  const address = Address.p2tr.fromPubKey(tpubkey, NETWORK);

  // Return the generated address.
  return address;
}

// Function to get all signatures for a transaction
const getAllSigs = ({ inputs, outputs, seckey, multisig }: any) => {
  // Create a transaction with the provided inputs and outputs
  const txdata = Tx.create({
    vin: inputs,
    vout: outputs,
  });
  // Create a copy of the multisig array
  const temp_multisig = [...multisig];
  // Get the threshold value from the first element of the array
  const threshold = temp_multisig[0];
  // Remove the first element from the array
  temp_multisig.splice(0, 1);
  // Initialize the script with the first opcode as 0
  const script = [0];
  // For each item in the multisig array, add it to the script along with the OP_CHECKSIGADD opcode
  temp_multisig.forEach((item) => {
    script.push(item, 'OP_CHECKSIGADD');
  });
  // Generate a placeholder public key
  const placeholderPubkey = 'ab'.repeat(32);
  // Add the threshold and the OP_EQUAL opcode to the script
  script.push(threshold, 'OP_EQUAL');
  // Encode the script
  const sbytes = Script.encode(script);
  // Get the leaf of the Taproot tree for the encoded script
  const tapleaf = Tap.tree.getLeaf(sbytes);
  // Get the public key and control block for the Taproot address
  const [tpubkey, cblock] = Tap.getPubKey(placeholderPubkey, {
    target: tapleaf,
  });
  // Initialize an empty array for the signatures
  const all_sigs = [];
  // For each input, generate a signature and add it to the array
  for (let i = 0; i < inputs.length; i++) {
    var sig = Signer.taproot.sign(seckey, txdata, i, { extension: tapleaf });
    all_sigs.push(sig.hex);
  }

  // Return the array of signatures
  return all_sigs;
};

export function getApprovalSigs({ inputs, outputs, seckey, multisig }: any) {
  return inputs.length && outputs.length
    ? getAllSigs({ inputs, outputs, seckey, multisig })
    : 1;
}
// // This is for generate proposal
// export function generateProposal (
//   proposal: Array<string>,
//   thereshold: String,
//   string {
//  // Initialize proposal
//   const proposal: (string);
// // This function is used to generate a proposal
// export function generateProposal(proposal: Array<string>, threshold: string): Array<string> {
//   // Initialize an empty array for the generated proposal
//   const generatedProposal: Array<string> = [];

//   // For each item in the input proposal array, add it to the generated proposal
//   proposal.forEach((item) => {
//     generatedProposal.push(item);
//   });

//   // Add the threshold to the generated proposal
//   generatedProposal.push(threshold);

//   // Return the generated proposal array
//   return generatedProposal;
// }

// // Example usage:
// const inputProposal = ['item1', 'item2', 'item3'];
// const threshold = '2';
// const generatedProposal = generateProposal(inputProposal, threshold);
// console.log(generatedProposal);
