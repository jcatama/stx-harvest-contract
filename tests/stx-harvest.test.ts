import { Cl } from '@stacks/transactions';
import { beforeEach, describe, expect, it } from 'vitest';

const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer') ?? '';
const wallet_1 = accounts.get('wallet_1') ?? '';
const wallet_2 = accounts.get('wallet_2') ?? '';
// const wallet_3 = accounts.get('wallet_3') ?? '';

describe('harvest contract', () => {
	beforeEach(() => {
		simnet.mineEmptyBlock();
		const { result } = simnet.callPublicFn(
			'stx-harvest',
			'approve-nft-contract',
			[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.bool(true)],
			deployer,
		);
		expect(result).toBeOk(Cl.bool(true));
	});

	describe('stx-harvest', () => {
		it('successfully sells NFT for tax loss', () => {
			const { result: mint_result } = simnet.callPublicFn(
				'blob',
				'mint',
				[Cl.principal(wallet_1)],
				wallet_1,
			);
			expect(mint_result).toBeOk(Cl.uint(1));

			const initial_balance = simnet.getAssetsMap().get('STX')?.get(wallet_1) || 0n;

			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'harvest',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.uint(1)],
				wallet_1,
			);

			expect(result).toBeOk(
				Cl.tuple({
					seller: Cl.principal(wallet_1),
					'token-id': Cl.uint(1),
					'sale-price': Cl.uint(10000),
				}),
			);

			const final_balance = simnet.getAssetsMap().get('STX')?.get(wallet_1) || 0n;
			const net_cost = initial_balance - final_balance;
			expect(net_cost).toBe(990000n);
		});

		it('transfers NFT to contract', () => {
			simnet.callPublicFn('blob', 'mint', [Cl.principal(wallet_1)], wallet_1);

			simnet.callPublicFn(
				'stx-harvest',
				'harvest',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.uint(1)],
				wallet_1,
			);

			const { result: owner_result } = simnet.callReadOnlyFn(
				'blob',
				'get-owner',
				[Cl.uint(1)],
				wallet_1,
			);

			expect(owner_result).toBeOk(Cl.some(Cl.principal(`${simnet.deployer}.stx-harvest`)));
		});

		it('fails with insufficient payment', () => {
			simnet.callPublicFn('blob', 'mint', [Cl.principal(wallet_1)], wallet_1);

			const initial_balance = simnet.getAssetsMap().get('STX')?.get(wallet_1) || 0n;
			simnet.transferSTX(initial_balance - 500000n, wallet_2, wallet_1);

			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'harvest',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.uint(1)],
				wallet_1,
			);

			expect(result).toBeErr(Cl.uint(102));
		});

		it("fails if user doesn't own NFT", () => {
			simnet.callPublicFn('blob', 'mint', [Cl.principal(wallet_1)], wallet_1);

			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'harvest',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.uint(1)],
				wallet_2,
			);

			expect(result).toBeErr(Cl.uint(109));
		});

		it('increases contract balance by net amount', () => {
			simnet.callPublicFn('blob', 'mint', [Cl.principal(wallet_1)], wallet_1);

			const { result: initial_balance_result } = simnet.callReadOnlyFn(
				'stx-harvest',
				'get-contract-balance',
				[],
				deployer,
			);
			expect(initial_balance_result).toBeOk(Cl.uint(0));

			simnet.callPublicFn(
				'stx-harvest',
				'harvest',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.uint(1)],
				wallet_1,
			);

			const { result: final_balance_result } = simnet.callReadOnlyFn(
				'stx-harvest',
				'get-contract-balance',
				[],
				deployer,
			);

			expect(final_balance_result).toBeOk(Cl.uint(990000));
		});
	});

	describe('withdraw-stx', () => {
		it('allows owner to withdraw STX', () => {
			simnet.callPublicFn('blob', 'mint', [Cl.principal(wallet_1)], wallet_1);

			simnet.callPublicFn(
				'stx-harvest',
				'harvest',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.uint(1)],
				wallet_1,
			);

			const initial_deployer_balance = simnet.getAssetsMap().get('STX')?.get(deployer) || 0n;

			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'withdraw-stx',
				[Cl.uint(500000), Cl.principal(deployer)],
				deployer,
			);

			expect(result).toBeOk(Cl.bool(true));

			const final_deployer_balance = simnet.getAssetsMap().get('STX')?.get(deployer) || 0n;
			expect(final_deployer_balance - initial_deployer_balance).toBe(500000n);
		});

		it('fails when non-owner tries to withdraw', () => {
			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'withdraw-stx',
				[Cl.uint(100000), Cl.principal(wallet_1)],
				wallet_1,
			);

			expect(result).toBeErr(Cl.uint(110));
		});

		it('fails when withdrawing more than contract balance', () => {
			simnet.callPublicFn('blob', 'mint', [Cl.principal(wallet_1)], wallet_1);

			simnet.callPublicFn(
				'stx-harvest',
				'harvest',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.uint(1)],
				wallet_1,
			);

			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'withdraw-stx',
				[Cl.uint(2000000), Cl.principal(deployer)],
				deployer,
			);

			expect(result).toBeErr(Cl.uint(108));
		});
	});

	describe('recover-nft', () => {
		it('allows owner to recover NFT from contract', () => {
			simnet.callPublicFn('blob', 'mint', [Cl.principal(wallet_1)], wallet_1);

			simnet.callPublicFn(
				'stx-harvest',
				'harvest',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.uint(1)],
				wallet_1,
			);

			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'recover-nft',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.uint(1), Cl.principal(wallet_2)],
				deployer,
			);

			expect(result).toBeOk(Cl.bool(true));

			const { result: owner_result } = simnet.callReadOnlyFn(
				'blob',
				'get-owner',
				[Cl.uint(1)],
				deployer,
			);

			expect(owner_result).toBeOk(Cl.some(Cl.principal(wallet_2)));
		});

		it('fails when non-owner tries to recover NFT', () => {
			simnet.callPublicFn('blob', 'mint', [Cl.principal(wallet_1)], wallet_1);

			simnet.callPublicFn(
				'stx-harvest',
				'harvest',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.uint(1)],
				wallet_1,
			);

			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'recover-nft',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.uint(1), Cl.principal(wallet_2)],
				wallet_1,
			);

			expect(result).toBeErr(Cl.uint(110));
		});
	});

	describe('remove-nft-contract', () => {
		it('allows owner to remove NFT contract from approved list', () => {
			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'remove-nft-contract',
				[Cl.contractPrincipal(simnet.deployer, 'blob')],
				deployer,
			);

			expect(result).toBeOk(Cl.bool(true));

			const { result: status_result } = simnet.callReadOnlyFn(
				'stx-harvest',
				'get-nft-contract-status',
				[Cl.contractPrincipal(simnet.deployer, 'blob')],
				deployer,
			);

			expect(status_result).toBeOk(Cl.none());
		});

		it('fails when non-owner tries to remove NFT contract', () => {
			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'remove-nft-contract',
				[Cl.contractPrincipal(simnet.deployer, 'blob')],
				wallet_1,
			);

			expect(result).toBeErr(Cl.uint(110));
		});

		it('prevents harvest after contract is removed', () => {
			simnet.callPublicFn('blob', 'mint', [Cl.principal(wallet_1)], wallet_1);

			simnet.callPublicFn(
				'stx-harvest',
				'remove-nft-contract',
				[Cl.contractPrincipal(simnet.deployer, 'blob')],
				deployer,
			);

			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'harvest',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.uint(1)],
				wallet_1,
			);

			expect(result).toBeErr(Cl.uint(104));
		});
	});

	describe('admin management', () => {
		it('allows owner to add admin', () => {
			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'add-admin',
				[Cl.principal(wallet_1)],
				deployer,
			);

			expect(result).toBeOk(Cl.bool(true));

			const { result: is_admin_result } = simnet.callReadOnlyFn(
				'stx-harvest',
				'check-is-admin',
				[Cl.principal(wallet_1)],
				deployer,
			);

			expect(is_admin_result).toBeOk(Cl.bool(true));
		});

		it('allows admin to withdraw STX', () => {
			simnet.callPublicFn('stx-harvest', 'add-admin', [Cl.principal(wallet_1)], deployer);

			simnet.callPublicFn('blob', 'mint', [Cl.principal(wallet_2)], wallet_2);

			simnet.callPublicFn(
				'stx-harvest',
				'harvest',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.uint(1)],
				wallet_2,
			);

			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'withdraw-stx',
				[Cl.uint(500000), Cl.principal(wallet_1)],
				wallet_1,
			);

			expect(result).toBeOk(Cl.bool(true));
		});

		it('allows admin to approve NFT contract', () => {
			simnet.callPublicFn('stx-harvest', 'add-admin', [Cl.principal(wallet_1)], deployer);

			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'approve-nft-contract',
				[Cl.contractPrincipal(simnet.deployer, 'unknown-nft'), Cl.bool(true)],
				wallet_1,
			);

			expect(result).toBeOk(Cl.bool(true));
		});

		it('allows owner to remove admin', () => {
			simnet.callPublicFn('stx-harvest', 'add-admin', [Cl.principal(wallet_1)], deployer);

			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'remove-admin',
				[Cl.principal(wallet_1)],
				deployer,
			);

			expect(result).toBeOk(Cl.bool(true));

			const { result: is_admin_result } = simnet.callReadOnlyFn(
				'stx-harvest',
				'check-is-admin',
				[Cl.principal(wallet_1)],
				deployer,
			);

			expect(is_admin_result).toBeOk(Cl.bool(false));
		});

		it('prevents non-owner from adding admin', () => {
			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'add-admin',
				[Cl.principal(wallet_2)],
				wallet_1,
			);

			expect(result).toBeErr(Cl.uint(100));
		});

		it('prevents non-owner from removing admin', () => {
			simnet.callPublicFn('stx-harvest', 'add-admin', [Cl.principal(wallet_1)], deployer);

			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'remove-admin',
				[Cl.principal(wallet_1)],
				wallet_2,
			);

			expect(result).toBeErr(Cl.uint(100));
		});

		it('prevents removing contract owner as admin', () => {
			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'remove-admin',
				[Cl.principal(deployer)],
				deployer,
			);

			expect(result).toBeErr(Cl.uint(111));
		});

		it('check-is-admin returns true for contract owner', () => {
			const { result } = simnet.callReadOnlyFn(
				'stx-harvest',
				'check-is-admin',
				[Cl.principal(deployer)],
				deployer,
			);

			expect(result).toBeOk(Cl.bool(true));
		});

		it('check-is-admin returns false for non-admin', () => {
			const { result } = simnet.callReadOnlyFn(
				'stx-harvest',
				'check-is-admin',
				[Cl.principal(wallet_1)],
				deployer,
			);

			expect(result).toBeOk(Cl.bool(false));
		});
	});

	describe('read-only functions', () => {
		it('get-contract-balance returns correct balance', () => {
			const { result } = simnet.callReadOnlyFn('stx-harvest', 'get-contract-balance', [], deployer);

			expect(result).toBeOk(Cl.uint(0));
		});

		it('get-fee-info returns correct fee structure', () => {
			const { result } = simnet.callReadOnlyFn('stx-harvest', 'get-fee-info', [], deployer);

			expect(result).toBeOk(
				Cl.tuple({
					fee: Cl.uint(1000000),
					refund: Cl.uint(10000),
					'net-cost': Cl.uint(990000),
				}),
			);
		});

		it('is-nft-approved returns true for approved contracts', () => {
			const { result } = simnet.callReadOnlyFn(
				'stx-harvest',
				'is-nft-approved',
				[Cl.contractPrincipal(simnet.deployer, 'blob')],
				deployer,
			);

			expect(result).toBeOk(Cl.bool(true));
		});

		it('is-nft-approved returns false for unapproved contracts', () => {
			const { result } = simnet.callReadOnlyFn(
				'stx-harvest',
				'is-nft-approved',
				[Cl.contractPrincipal(simnet.deployer, 'unknown-nft')],
				deployer,
			);

			expect(result).toBeOk(Cl.bool(false));
		});

		it('get-nft-contract-status returns some(true) for approved contracts', () => {
			const { result } = simnet.callReadOnlyFn(
				'stx-harvest',
				'get-nft-contract-status',
				[Cl.contractPrincipal(simnet.deployer, 'blob')],
				deployer,
			);

			expect(result).toBeOk(Cl.some(Cl.bool(true)));
		});

		it('get-nft-contract-status returns none for contracts not in map', () => {
			const { result } = simnet.callReadOnlyFn(
				'stx-harvest',
				'get-nft-contract-status',
				[Cl.contractPrincipal(simnet.deployer, 'unknown-nft')],
				deployer,
			);

			expect(result).toBeOk(Cl.none());
		});

		it('get-nft-contract-status returns some(false) for explicitly disapproved contracts', () => {
			simnet.callPublicFn(
				'stx-harvest',
				'approve-nft-contract',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.bool(false)],
				deployer,
			);

			const { result } = simnet.callReadOnlyFn(
				'stx-harvest',
				'get-nft-contract-status',
				[Cl.contractPrincipal(simnet.deployer, 'blob')],
				deployer,
			);

			expect(result).toBeOk(Cl.some(Cl.bool(false)));
		});
	});

	describe('security edge cases', () => {
		it('fails withdraw with zero amount', () => {
			simnet.callPublicFn('blob', 'mint', [Cl.principal(wallet_1)], wallet_1);
			simnet.callPublicFn(
				'stx-harvest',
				'harvest',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.uint(1)],
				wallet_1,
			);

			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'withdraw-stx',
				[Cl.uint(0), Cl.principal(deployer)],
				deployer,
			);

			expect(result).toBeErr(Cl.uint(106));
		});

		it('fails withdraw to contract itself', () => {
			simnet.callPublicFn('blob', 'mint', [Cl.principal(wallet_1)], wallet_1);
			simnet.callPublicFn(
				'stx-harvest',
				'harvest',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.uint(1)],
				wallet_1,
			);

			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'withdraw-stx',
				[Cl.uint(100000), Cl.contractPrincipal(simnet.deployer, 'stx-harvest')],
				deployer,
			);

			expect(result).toBeErr(Cl.uint(112));
		});

		it('fails recover-nft to contract itself', () => {
			simnet.callPublicFn('blob', 'mint', [Cl.principal(wallet_1)], wallet_1);
			simnet.callPublicFn(
				'stx-harvest',
				'harvest',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.uint(1)],
				wallet_1,
			);

			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'recover-nft',
				[
					Cl.contractPrincipal(simnet.deployer, 'blob'),
					Cl.uint(1),
					Cl.contractPrincipal(simnet.deployer, 'stx-harvest'),
				],
				deployer,
			);

			expect(result).toBeErr(Cl.uint(112));
		});

		it('fails add-admin for already existing admin', () => {
			simnet.callPublicFn('stx-harvest', 'add-admin', [Cl.principal(wallet_1)], deployer);

			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'add-admin',
				[Cl.principal(wallet_1)],
				deployer,
			);

			expect(result).toBeErr(Cl.uint(113));
		});

		it('fails add-admin for contract owner', () => {
			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'add-admin',
				[Cl.principal(deployer)],
				deployer,
			);

			expect(result).toBeErr(Cl.uint(113));
		});

		it('fails add-admin for contract itself', () => {
			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'add-admin',
				[Cl.contractPrincipal(simnet.deployer, 'stx-harvest')],
				deployer,
			);

			expect(result).toBeErr(Cl.uint(107));
		});

		it('fails approve-nft-contract for contract itself', () => {
			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'approve-nft-contract',
				[Cl.contractPrincipal(simnet.deployer, 'stx-harvest'), Cl.bool(true)],
				deployer,
			);

			expect(result).toBeErr(Cl.uint(107));
		});

		it('fails remove-nft-contract for contract itself', () => {
			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'remove-nft-contract',
				[Cl.contractPrincipal(simnet.deployer, 'stx-harvest')],
				deployer,
			);

			expect(result).toBeErr(Cl.uint(107));
		});

		it('fails harvest for explicitly disapproved NFT contract', () => {
			simnet.callPublicFn('blob', 'mint', [Cl.principal(wallet_1)], wallet_1);
			simnet.callPublicFn(
				'stx-harvest',
				'approve-nft-contract',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.bool(false)],
				deployer,
			);

			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'harvest',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.uint(1)],
				wallet_1,
			);

			expect(result).toBeErr(Cl.uint(104));
		});

		it('recover-nft succeeds for disapproved NFT contract', () => {
			simnet.callPublicFn('blob', 'mint', [Cl.principal(wallet_1)], wallet_1);

			simnet.callPublicFn(
				'stx-harvest',
				'harvest',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.uint(1)],
				wallet_1,
			);

			simnet.callPublicFn(
				'stx-harvest',
				'approve-nft-contract',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.bool(false)],
				deployer,
			);

			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'recover-nft',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.uint(1), Cl.principal(wallet_1)],
				deployer,
			);

			expect(result).toBeOk(Cl.bool(true));
		});

		it('recover-nft fails for unregistered NFT contract', () => {
			simnet.callPublicFn(
				'stx-harvest',
				'remove-nft-contract',
				[Cl.contractPrincipal(simnet.deployer, 'blob')],
				deployer,
			);

			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'recover-nft',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.uint(1), Cl.principal(wallet_1)],
				deployer,
			);

			expect(result).toBeErr(Cl.uint(104));
		});

		it('removed admin loses access immediately', () => {
			simnet.callPublicFn('stx-harvest', 'add-admin', [Cl.principal(wallet_1)], deployer);
			simnet.callPublicFn('stx-harvest', 'remove-admin', [Cl.principal(wallet_1)], deployer);

			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'approve-nft-contract',
				[Cl.contractPrincipal(simnet.deployer, 'unknown-nft'), Cl.bool(true)],
				wallet_1,
			);

			expect(result).toBeErr(Cl.uint(110));
		});

		it('fails set-fee-amounts with zero fee', () => {
			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'set-fee-amounts',
				[Cl.uint(0), Cl.uint(0)],
				deployer,
			);

			expect(result).toBeErr(Cl.uint(105));
		});

		it('fails set-fee-amounts with zero refund', () => {
			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'set-fee-amounts',
				[Cl.uint(1000000), Cl.uint(0)],
				deployer,
			);

			expect(result).toBeErr(Cl.uint(105));
		});

		it('fails set-fee-amounts when refund greater than fee', () => {
			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'set-fee-amounts',
				[Cl.uint(10000), Cl.uint(20000)],
				deployer,
			);

			expect(result).toBeErr(Cl.uint(105));
		});

		it('allows set-fee-amounts when fee equals refund', () => {
			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'set-fee-amounts',
				[Cl.uint(10000), Cl.uint(10000)],
				deployer,
			);

			expect(result).toBeOk(Cl.bool(true));

			const { result: fee_info } = simnet.callReadOnlyFn(
				'stx-harvest',
				'get-fee-info',
				[],
				deployer,
			);

			expect(fee_info).toBeOk(
				Cl.tuple({
					fee: Cl.uint(10000),
					refund: Cl.uint(10000),
					'net-cost': Cl.uint(0),
				}),
			);
		});

		it('admin can set fee amounts', () => {
			simnet.callPublicFn('stx-harvest', 'add-admin', [Cl.principal(wallet_1)], deployer);

			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'set-fee-amounts',
				[Cl.uint(2000000), Cl.uint(50000)],
				wallet_1,
			);

			expect(result).toBeOk(Cl.bool(true));
		});

		it('admin can remove nft contract', () => {
			simnet.callPublicFn('stx-harvest', 'add-admin', [Cl.principal(wallet_1)], deployer);

			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'remove-nft-contract',
				[Cl.contractPrincipal(simnet.deployer, 'blob')],
				wallet_1,
			);

			expect(result).toBeOk(Cl.bool(true));
		});

		it('admin can recover nft', () => {
			simnet.callPublicFn('stx-harvest', 'add-admin', [Cl.principal(wallet_1)], deployer);
			simnet.callPublicFn('blob', 'mint', [Cl.principal(wallet_2)], wallet_2);
			simnet.callPublicFn(
				'stx-harvest',
				'harvest',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.uint(1)],
				wallet_2,
			);

			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'recover-nft',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.uint(1), Cl.principal(deployer)],
				wallet_1,
			);

			expect(result).toBeOk(Cl.bool(true));
		});

		it('fails to remove non-existent admin', () => {
			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'remove-admin',
				[Cl.principal(wallet_2)],
				deployer,
			);

			expect(result).toBeErr(Cl.uint(115));
		});

		it('multiple harvests work correctly', () => {
			simnet.callPublicFn('blob', 'mint', [Cl.principal(wallet_1)], wallet_1);
			simnet.callPublicFn('blob', 'mint', [Cl.principal(wallet_1)], wallet_1);

			const { result: result1 } = simnet.callPublicFn(
				'stx-harvest',
				'harvest',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.uint(1)],
				wallet_1,
			);
			expect(result1).toBeOk(
				Cl.tuple({
					seller: Cl.principal(wallet_1),
					'token-id': Cl.uint(1),
					'sale-price': Cl.uint(10000),
				}),
			);

			const { result: result2 } = simnet.callPublicFn(
				'stx-harvest',
				'harvest',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.uint(2)],
				wallet_1,
			);
			expect(result2).toBeOk(
				Cl.tuple({
					seller: Cl.principal(wallet_1),
					'token-id': Cl.uint(2),
					'sale-price': Cl.uint(10000),
				}),
			);

			const { result: balance } = simnet.callReadOnlyFn(
				'stx-harvest',
				'get-contract-balance',
				[],
				deployer,
			);
			expect(balance).toBeOk(Cl.uint(1980000));
		});

		it('cannot harvest same NFT twice', () => {
			simnet.callPublicFn('blob', 'mint', [Cl.principal(wallet_1)], wallet_1);

			simnet.callPublicFn(
				'stx-harvest',
				'harvest',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.uint(1)],
				wallet_1,
			);

			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'harvest',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.uint(1)],
				wallet_1,
			);

			expect(result).toBeErr(Cl.uint(109));
		});

		it('recover-nft works for disapproved NFT contract', () => {
			simnet.callPublicFn('blob', 'mint', [Cl.principal(wallet_1)], wallet_1);
			simnet.callPublicFn(
				'stx-harvest',
				'harvest',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.uint(1)],
				wallet_1,
			);

			simnet.callPublicFn(
				'stx-harvest',
				'approve-nft-contract',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.bool(false)],
				deployer,
			);

			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'recover-nft',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.uint(1), Cl.principal(wallet_2)],
				deployer,
			);

			expect(result).toBeOk(Cl.bool(true));

			const { result: owner_result } = simnet.callReadOnlyFn(
				'blob',
				'get-owner',
				[Cl.uint(1)],
				deployer,
			);
			expect(owner_result).toBeOk(Cl.some(Cl.principal(wallet_2)));
		});
	});

	describe('pause mechanism', () => {
		it('admin can pause contract', () => {
			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'set-contract-paused',
				[Cl.bool(true)],
				deployer,
			);

			expect(result).toBeOk(Cl.bool(true));

			const { result: paused_result } = simnet.callReadOnlyFn(
				'stx-harvest',
				'is-contract-paused',
				[],
				deployer,
			);
			expect(paused_result).toBeOk(Cl.bool(true));
		});

		it('harvest fails when contract is paused', () => {
			simnet.callPublicFn('blob', 'mint', [Cl.principal(wallet_1)], wallet_1);
			simnet.callPublicFn('stx-harvest', 'set-contract-paused', [Cl.bool(true)], deployer);

			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'harvest',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.uint(1)],
				wallet_1,
			);

			expect(result).toBeErr(Cl.uint(114));
		});

		it('harvest works after unpause', () => {
			simnet.callPublicFn('blob', 'mint', [Cl.principal(wallet_1)], wallet_1);
			simnet.callPublicFn('stx-harvest', 'set-contract-paused', [Cl.bool(true)], deployer);
			simnet.callPublicFn('stx-harvest', 'set-contract-paused', [Cl.bool(false)], deployer);

			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'harvest',
				[Cl.contractPrincipal(simnet.deployer, 'blob'), Cl.uint(1)],
				wallet_1,
			);

			expect(result).toBeOk(
				Cl.tuple({
					seller: Cl.principal(wallet_1),
					'token-id': Cl.uint(1),
					'sale-price': Cl.uint(10000),
				}),
			);
		});

		it('non-admin cannot pause contract', () => {
			const { result } = simnet.callPublicFn(
				'stx-harvest',
				'set-contract-paused',
				[Cl.bool(true)],
				wallet_1,
			);

			expect(result).toBeErr(Cl.uint(110));
		});

		it('is-contract-paused returns false by default', () => {
			const { result } = simnet.callReadOnlyFn('stx-harvest', 'is-contract-paused', [], deployer);

			expect(result).toBeOk(Cl.bool(false));
		});
	});
});
