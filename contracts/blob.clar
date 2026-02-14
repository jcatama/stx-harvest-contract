(define-non-fungible-token blob uint)

(define-data-var last-token-id uint u0)

(define-constant err-owner-only (err u100))
(define-constant err-not-owner (err u101))
(define-constant err-already-exists (err u102))

(define-public (mint (recipient principal))
    (let
        (
            (token-id (+ (var-get last-token-id) u1))
        )
        (unwrap! (nft-mint? blob token-id recipient) err-already-exists)
        (var-set last-token-id token-id)
        (ok token-id)
    )
)

(define-public (transfer (token-id uint) (sender principal) (recipient principal))
    (begin
        (asserts! (is-eq sender tx-sender) err-not-owner)
        (nft-transfer? blob token-id sender recipient)
    )
)

(define-read-only (get-owner (token-id uint))
    (ok (nft-get-owner? blob token-id))
)

(define-read-only (get-last-token-id)
    (ok (var-get last-token-id))
)
