import './style.css';
import { Connection, clusterApiUrl, PublicKey, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider } from '@project-serum/anchor';
import idlData from './idl.json';


// 配置常量
const CONFIG = {
  CLUSTER: 'devnet',
  COMMITMENT: 'confirmed',
  COUNTER_PROGRAM_ID: '3PmKxGK4Dq8rcsdbr4cCK2RA1ND8UZohPZQrt3ofuEQh',
  IDL: idlData
};

// 应用状态
const AppState = {
  program: null,
  provider: null,
  counterPDA: null,
  walletConnected: false
};


// DOM 元素
let DOM = {};


// 初始化程序
const initializeProgram = (provider) => {
  try {
    return new Program(
      CONFIG.IDL,
      new PublicKey(CONFIG.COUNTER_PROGRAM_ID),
      provider
    );
  } catch (error) {
    console.error('Program initialization failed:', error);
    throw new Error('Failed to initialize program');
  }
};

// 钱包连接处理
const connectWalletHandler = async () => {
  try {
    if (!window.solana?.isPhantom) {
      alert('请安装 Phantom 钱包');
      return;
    }

    const wallet = window.solana;
    await wallet.connect();

    const connection = new Connection(clusterApiUrl(CONFIG.CLUSTER), CONFIG.COMMITMENT);
    const provider = new AnchorProvider(
      connection,
      wallet,
      { commitment: CONFIG.COMMITMENT }
    );

    AppState.program = initializeProgram(provider);
    AppState.provider = provider;
    AppState.walletConnected = true;

    updateUIOnConnect(wallet.publicKey);
    await updateBalance(wallet.publicKey);
    await autoDetectCounter(wallet.publicKey);
  } catch (error) {
    handleError(error, '钱包连接失败');
  }
};

// 创建计数器
const createCounterHandler = async () => {
  try {
    if (!AppState.walletConnected) {
      alert('请先连接钱包');
      return;
    }

    const authority = AppState.provider.wallet.publicKey;
    const [counterPDA] = PublicKey.findProgramAddressSync(
      [authority.toBuffer()],
      AppState.program.programId
    );

    await AppState.program.methods.createCounter()
      .accounts({
        authority,
        counter: counterPDA,
        systemProgram: SystemProgram.programId
      })
      .rpc();

    AppState.counterPDA = counterPDA;
    updateUIAfterCounterCreation();
    await fetchCounterValue();
  } catch (error) {
    handleError(error, '创建计数器失败');
  }
};

// 更新计数器
const updateCounterHandler = async () => {
  try {
    if (!AppState.counterPDA) {
      alert('请先创建计数器');
      return;
    }

    await AppState.program.methods.updateCounter()
      .accounts({
        authority: AppState.provider.wallet.publicKey,
        counter: AppState.counterPDA
      })
      .rpc();

    await fetchCounterValue();
  } catch (error) {
    handleError(error, '更新计数器失败');
  }
};

// 获取计数器值
const fetchCounterValue = async () => {
  try {
    const account = await AppState.program.account.counter.fetch(AppState.counterPDA);
    DOM.counterValue.textContent = `计数值: ${account.count}`;
  } catch {
    DOM.counterValue.textContent = '计数值: 0';
  }
};

// 自动检测计数器
const autoDetectCounter = async (publicKey) => {
  try {
    const [pda] = PublicKey.findProgramAddressSync(
      [publicKey.toBuffer()],
      AppState.program.programId
    );
    AppState.counterPDA = pda;
    DOM.counterAddress.textContent = `计数器地址: ${pda}`;
    DOM.updateBtn.style.display = 'inline-block';
    await fetchCounterValue(pda);

  } catch {
    DOM.counterValue.textContent = '计数值: 0';
  }
};

// 更新余额
const updateBalance = async (publicKey) => {
  const balance = await AppState.provider.connection.getBalance(publicKey);
  DOM.userBalance.textContent = `余额: ${(balance / 1e9).toFixed(4)} SOL`;
};

// 更新 UI 状态
const updateUIOnConnect = (publicKey) => {
  DOM.loginInfo.textContent = '已连接 ✅';
  DOM.userAddress.textContent = `地址: ${publicKey}`;
  DOM.connectBtn.style.display = 'none';
  DOM.createBtn.style.display = 'inline-block';
};

const updateUIAfterCounterCreation = () => {
  DOM.counterAddress.textContent = `计数器地址: ${AppState.counterPDA}`;
  DOM.updateBtn.style.display = 'inline-block';
};

// 错误处理
const handleError = (error, context) => {
  console.error(`${context}:`, error);
  alert(`${context}: ${error.message}`);
};

// 初始化页面
const initializePage = () => {
  document.querySelector('#app').innerHTML = `
    <div id="wallet_info">
      <p id="login_info">未连接</p>
      <p id="user_add">地址: 未连接</p>
      <p id="user_sol_balance">余额: 0 SOL</p>
      <p id="counter_address">用户的计数器PDA: 未创建</p>
      <p id="counter_value">计数: 0</p>
    </div>
    <button id="connect_btu">连接 Phantom 钱包</button>
    <button id="create_btu" style="display:none;">创建计数器</button>
    <button id="update_btu" style="display:none;">+1 计数器</button>
  `;

  // 获取 DOM 元素
  DOM = {
    loginInfo: document.getElementById('login_info'),
    userAddress: document.getElementById('user_add'),
    userBalance: document.getElementById('user_sol_balance'),
    counterAddress: document.getElementById('counter_address'),
    counterValue: document.getElementById('counter_value'),
    connectBtn: document.getElementById('connect_btu'),
    createBtn: document.getElementById('create_btu'),
    updateBtn: document.getElementById('update_btu')
  };

  // 绑定事件
  DOM.connectBtn.addEventListener('click', connectWalletHandler);
  DOM.createBtn.addEventListener('click', createCounterHandler);
  DOM.updateBtn.addEventListener('click', updateCounterHandler);
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initializePage);
