use argent::signer::signer_signature::SECP_256_K1_HALF;
use argent::utils::bytes::eight_words_to_u256;
use core::sha256::compute_sha256_byte_array;
use starknet::eth_signature::public_key_point_to_eth_address;
use starknet::secp256_trait::{Signature as Secp256Signature, is_signature_entry_valid, recover_public_key};
use starknet::secp256k1::Secp256k1Point;
use starknet::EthAddress;

/// Bitcoin message prefix: "\x18Bitcoin Signed Message:\n" (25 bytes)
const BITCOIN_PREFIX_LEN: usize = 25;

/// Validates a Bitcoin-style secp256k1 signature against a Starknet tx hash.
///
/// The Ledger Bitcoin app wraps messages with:
///   SHA256(SHA256("\x18Bitcoin Signed Message:\n" + varint(len) + message))
///
/// We reconstruct this on-chain and recover the signer's ETH address.
#[must_use]
pub fn is_valid_bitcoin_signature(hash: felt252, pubkey_hash: EthAddress, signature: Secp256Signature) -> bool {
    // Validate r and s are valid secp256k1 scalars (reject out-of-range values)
    assert(is_signature_entry_valid::<Secp256k1Point>(signature.r), 'argent/invalid-r-value');
    assert(is_signature_entry_valid::<Secp256k1Point>(signature.s), 'argent/invalid-s-value');
    // Anti-malleability check
    assert(signature.s <= SECP_256_K1_HALF, 'argent/malleable-signature');

    // Convert felt252 hash to u256
    let hash_u256: u256 = hash.into();

    // Build the 58-byte Bitcoin message:
    //   "\x18Bitcoin Signed Message:\n" (25 bytes) + 0x20 (varint for 32) + tx_hash (32 bytes)
    let mut msg: ByteArray = "";

    // Prefix: \x18Bitcoin Signed Message:\n
    msg.append_byte(0x18);
    msg.append_byte(0x42); // B
    msg.append_byte(0x69); // i
    msg.append_byte(0x74); // t
    msg.append_byte(0x63); // c
    msg.append_byte(0x6f); // o
    msg.append_byte(0x69); // i
    msg.append_byte(0x6e); // n
    msg.append_byte(0x20); // (space)
    msg.append_byte(0x53); // S
    msg.append_byte(0x69); // i
    msg.append_byte(0x67); // g
    msg.append_byte(0x6e); // n
    msg.append_byte(0x65); // e
    msg.append_byte(0x64); // d
    msg.append_byte(0x20); // (space)
    msg.append_byte(0x4d); // M
    msg.append_byte(0x65); // e
    msg.append_byte(0x73); // s
    msg.append_byte(0x73); // s
    msg.append_byte(0x61); // a
    msg.append_byte(0x67); // g
    msg.append_byte(0x65); // e
    msg.append_byte(0x3a); // :
    msg.append_byte(0x0a); // \n

    // Varint for 32 bytes = 0x20
    msg.append_byte(0x20);

    // Append the 32-byte tx hash in big-endian
    append_u128_be(ref msg, hash_u256.high);
    append_u128_be(ref msg, hash_u256.low);

    // First SHA256
    let first_hash = compute_sha256_byte_array(@msg);

    // Second SHA256: hash the 32-byte result of the first hash
    let mut second_input: ByteArray = "";
    append_u32_be(ref second_input, first_hash);
    let double_hash_words = compute_sha256_byte_array(@second_input);

    // Convert [u32; 8] to u256
    let double_hash: u256 = eight_words_to_u256(double_hash_words);

    // Recover public key from the double hash
    let recovered = recover_public_key::<Secp256k1Point>(double_hash, signature);
    if recovered.is_none() {
        return false;
    }

    let recovered_address = public_key_point_to_eth_address(recovered.unwrap());
    recovered_address == pubkey_hash
}

/// Appends a u128 as 16 big-endian bytes to a ByteArray
fn append_u128_be(ref ba: ByteArray, value: u128) {
    let mut i: u32 = 0;
    loop {
        if i == 16 {
            break;
        }
        // Extract byte at position i (most significant first)
        let shift = 120 - (i * 8);
        let byte: u8 = ((value / pow2_128(shift)) % 256).try_into().unwrap();
        ba.append_byte(byte);
        i += 1;
    };
}

/// Appends [u32; 8] as 32 big-endian bytes to a ByteArray
fn append_u32_be(ref ba: ByteArray, words: [u32; 8]) {
    let [w0, w1, w2, w3, w4, w5, w6, w7] = words;
    append_single_u32_be(ref ba, w0);
    append_single_u32_be(ref ba, w1);
    append_single_u32_be(ref ba, w2);
    append_single_u32_be(ref ba, w3);
    append_single_u32_be(ref ba, w4);
    append_single_u32_be(ref ba, w5);
    append_single_u32_be(ref ba, w6);
    append_single_u32_be(ref ba, w7);
}

/// Appends a single u32 as 4 big-endian bytes
fn append_single_u32_be(ref ba: ByteArray, value: u32) {
    ba.append_byte(((value / 0x1000000) % 0x100).try_into().unwrap());
    ba.append_byte(((value / 0x10000) % 0x100).try_into().unwrap());
    ba.append_byte(((value / 0x100) % 0x100).try_into().unwrap());
    ba.append_byte((value % 0x100).try_into().unwrap());
}

/// Returns 2^n for bit shifts on u128 values
fn pow2_128(n: u32) -> u128 {
    if n == 0 {
        return 1;
    }
    if n == 8 {
        return 0x100;
    }
    if n == 16 {
        return 0x10000;
    }
    if n == 24 {
        return 0x1000000;
    }
    if n == 32 {
        return 0x100000000;
    }
    if n == 40 {
        return 0x10000000000;
    }
    if n == 48 {
        return 0x1000000000000;
    }
    if n == 56 {
        return 0x100000000000000;
    }
    if n == 64 {
        return 0x10000000000000000;
    }
    if n == 72 {
        return 0x1000000000000000000;
    }
    if n == 80 {
        return 0x100000000000000000000;
    }
    if n == 88 {
        return 0x10000000000000000000000;
    }
    if n == 96 {
        return 0x1000000000000000000000000;
    }
    if n == 104 {
        return 0x100000000000000000000000000;
    }
    if n == 112 {
        return 0x10000000000000000000000000000;
    }
    if n == 120 {
        return 0x1000000000000000000000000000000;
    }
    panic!("pow2_128: unsupported shift")
}

#[cfg(test)]
mod tests {
    use starknet::secp256_trait::Signature as Secp256Signature;
    use starknet::EthAddress;
    use super::is_valid_bitcoin_signature;

    // Test key: privkey = 0xdeadbeef...deadbeef (32 bytes)
    // pubkey_hash (keccak256 of uncompressed coords, last 20 bytes):
    const TEST_PUBKEY_HASH: felt252 = 0xc96aaa54e2d44c299564da76e1cd3184a2386b8d;

    // ============================================================
    // Vector 1: hash = 0x04a1c2e3...89abcd (typical felt252)
    // ============================================================
    const HASH_1: felt252 = 0x04a1c2e3d4b5f6a7890123456789abcdef0123456789abcdef0123456789abcd;

    fn sig_1() -> Secp256Signature {
        Secp256Signature {
            r: u256 { low: 0x9c6e933df0d2cf9289add73c29e4db4, high: 0x2086edd8bd10a11e48563a3057bda572 },
            s: u256 { low: 0xf76aa47b8659304923709b878548488c, high: 0x33edc6ff736fc4d2dbda31ed9b9b1fef },
            y_parity: false,
        }
    }

    // ============================================================
    // Vector 2: hash = 1 (small felt252, tests leading-zero encoding)
    // ============================================================
    const HASH_2: felt252 = 0x01;

    fn sig_2() -> Secp256Signature {
        Secp256Signature {
            r: u256 { low: 0xcae8daa584d516066357a7098636745b, high: 0xfb5440b3c11cef320f2394f7183f500 },
            s: u256 { low: 0xcf61c21769347f6c9ec0448ecee8c434, high: 0x24134ebacca53b02f668390471c10e2b },
            y_parity: false,
        }
    }

    // ============================================================
    // Vector 3: hash near max felt252 (tests large value encoding)
    // ============================================================
    const HASH_3: felt252 = 0x07ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;

    fn sig_3() -> Secp256Signature {
        Secp256Signature {
            r: u256 { low: 0x1c887e71d96d32ffd91d3be0401e5fb3, high: 0x87a375a2d1222c033fb71912bdd2c0e7 },
            s: u256 { low: 0xffbd3d482078442a50e60ab619d7d548, high: 0x738a86f208d9ce27a6cf1be1d401412d },
            y_parity: false,
        }
    }

    // ============================================================
    // Test 1: Valid signature (typical hash)
    // ============================================================
    #[test]
    fn test_valid_bitcoin_signature() {
        let pubkey_hash: EthAddress = TEST_PUBKEY_HASH.try_into().unwrap();
        assert(is_valid_bitcoin_signature(HASH_1, pubkey_hash, sig_1()), 'sig1 should be valid');
    }

    // ============================================================
    // Test 2: Valid signature with small hash (hash = 1)
    // ============================================================
    #[test]
    fn test_valid_bitcoin_signature_small_hash() {
        let pubkey_hash: EthAddress = TEST_PUBKEY_HASH.try_into().unwrap();
        assert(is_valid_bitcoin_signature(HASH_2, pubkey_hash, sig_2()), 'sig2 should be valid');
    }

    // ============================================================
    // Test 3: Valid signature with large hash
    // ============================================================
    #[test]
    fn test_valid_bitcoin_signature_large_hash() {
        let pubkey_hash: EthAddress = TEST_PUBKEY_HASH.try_into().unwrap();
        assert(is_valid_bitcoin_signature(HASH_3, pubkey_hash, sig_3()), 'sig3 should be valid');
    }

    // ============================================================
    // Test 4: Reject wrong pubkey_hash
    // ============================================================
    #[test]
    fn test_reject_wrong_pubkey_hash() {
        let wrong_hash: EthAddress = 0xdeaddeaddeaddeaddeaddeaddeaddeaddeaddead_felt252.try_into().unwrap();
        assert(!is_valid_bitcoin_signature(HASH_1, wrong_hash, sig_1()), 'wrong hash should fail');
    }

    // ============================================================
    // Test 5: Reject high-s (malleable) signature — must revert
    // ============================================================
    #[test]
    #[should_panic(expected: 'argent/malleable-signature')]
    fn test_reject_high_s_signature() {
        let pubkey_hash: EthAddress = TEST_PUBKEY_HASH.try_into().unwrap();
        // High-s = CURVE_ORDER - s from vector 1
        let high_s_sig = Secp256Signature {
            r: u256 { low: 0x9c6e933df0d2cf9289add73c29e4db4, high: 0x2086edd8bd10a11e48563a3057bda572 },
            s: u256 { low: 0xc344386b28ef6ff29c61c3054aedf8b5, high: 0xcc1239008c903b2d2425ce126464e00e },
            y_parity: true,
        };
        is_valid_bitcoin_signature(HASH_1, pubkey_hash, high_s_sig);
    }

    // ============================================================
    // Test 6: Reject r = 0 — must revert with invalid-r-value
    // ============================================================
    #[test]
    #[should_panic(expected: 'argent/invalid-r-value')]
    fn test_reject_zero_r() {
        let pubkey_hash: EthAddress = TEST_PUBKEY_HASH.try_into().unwrap();
        let bad_sig = Secp256Signature {
            r: 0_u256,
            s: u256 { low: 0xf76aa47b8659304923709b878548488c, high: 0x33edc6ff736fc4d2dbda31ed9b9b1fef },
            y_parity: false,
        };
        is_valid_bitcoin_signature(HASH_1, pubkey_hash, bad_sig);
    }

    // ============================================================
    // Test 7: Reject s = 0 — must revert with invalid-s-value
    // ============================================================
    #[test]
    #[should_panic(expected: 'argent/invalid-s-value')]
    fn test_reject_zero_s() {
        let pubkey_hash: EthAddress = TEST_PUBKEY_HASH.try_into().unwrap();
        let bad_sig = Secp256Signature {
            r: u256 { low: 0x9c6e933df0d2cf9289add73c29e4db4, high: 0x2086edd8bd10a11e48563a3057bda572 },
            s: 0_u256,
            y_parity: false,
        };
        is_valid_bitcoin_signature(HASH_1, pubkey_hash, bad_sig);
    }

    // ============================================================
    // Test 8: Reject r >= curve order
    // ============================================================
    #[test]
    #[should_panic(expected: 'argent/invalid-r-value')]
    fn test_reject_r_gte_curve_order() {
        let pubkey_hash: EthAddress = TEST_PUBKEY_HASH.try_into().unwrap();
        // secp256k1 curve order
        let curve_order = u256 {
            low: 0xbaaedce6af48a03bbfd25e8cd0364141, high: 0xfffffffffffffffffffffffffffffffe,
        };
        let bad_sig = Secp256Signature {
            r: curve_order,
            s: u256 { low: 0xf76aa47b8659304923709b878548488c, high: 0x33edc6ff736fc4d2dbda31ed9b9b1fef },
            y_parity: false,
        };
        is_valid_bitcoin_signature(HASH_1, pubkey_hash, bad_sig);
    }

    // ============================================================
    // Test 9: Valid sig with hash from vector 1 but swapped to vector 2 hash → must fail
    // ============================================================
    #[test]
    fn test_reject_signature_hash_mismatch() {
        let pubkey_hash: EthAddress = TEST_PUBKEY_HASH.try_into().unwrap();
        // Use sig_1 but verify against HASH_2 — different hash means different recovery
        assert(!is_valid_bitcoin_signature(HASH_2, pubkey_hash, sig_1()), 'hash mismatch should fail');
    }
}
