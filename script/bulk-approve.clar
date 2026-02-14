(define-private (apprv (cont principal))
    (begin
        (try! (contract-call? 'SP3NXDXWMNZVSMBV7GX944PE8PFDT9023F1WDCCCV.stx-harvest approve-nft-contract cont true))
        (ok true)
    )
)

;; paste the output.clar contents here

(contract-call? 'SP3NXDXWMNZVSMBV7GX944PE8PFDT9023F1WDCCCV.stx-harvest remove-admin (as-contract tx-sender))
