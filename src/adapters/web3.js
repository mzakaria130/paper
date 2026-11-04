/**
 * Web3 Adapter Interface
 * Plug-in boundary for libraries like Viem, Ethers.js, or Web3.js.
 * Provides wallet connection, network querying, and execution hooks.
 */
import { bus } from '../core/bus.js';

export class Web3Adapter {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.chainId = null;
    this.connectedAccount = null;
  }

  /**
   * Connect browser wallet (MetaMask, Rabby, Coinbase, etc.)
   */
  async connect() {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        this.connectedAccount = accounts[0];
        const chainHex = await window.ethereum.request({ method: 'eth_chainId' });
        this.chainId = parseInt(chainHex, 16);

        bus.emit('web3:connected', { account: this.connectedAccount, chainId: this.chainId });
        return { account: this.connectedAccount, chainId: this.chainId };
      } catch (err) {
        bus.emit('web3:error', { action: 'connect', error: err });
        throw err;
      }
    } else {
      console.warn('[Web3Adapter] No window.ethereum detected. Running in mock/offline mode.');
      return null;
    }
  }

  isConnected() {
    return !!this.connectedAccount;
  }

  getAccount() {
    return this.connectedAccount;
  }
}

export const web3Adapter = new Web3Adapter();
