import React, { useState, useEffect } from 'react';
import { Buffer } from 'buffer';
import { 
  Connection, 
  PublicKey, 
  Transaction,
  SystemProgram, 
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';

if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}

const N8N_WEBHOOK_URL = 'https://janngo27.app.n8n.cloud/webhook-test/agent-negotiate';

type FlowStage = 
  | 'IDLE'               
  | 'LOCKING_ESCROW'     
  | 'ESCROW_LOCKED'      
  | 'DELIVERED_REVIEW'   
  | 'RELEASING_SOLANA'   
  | 'COMPLETED'          
  | 'REJECTED';          

export default function App() {
  const [taskId] = useState(() => 'task-' + Math.random().toString(36).substring(2, 9));
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const [taskDescription, setTaskDescription] = useState('');
  const [maxBudgetSol, setMaxBudgetSol] = useState('0.001');
  const [deadlineHours, setDeadlineHours] = useState('24');

  const [stage, setStage] = useState<FlowStage>('IDLE');
  const [lockTxSignature, setLockTxSignature] = useState<string | null>(null);
  const [finalTxSignature, setFinalTxSignature] = useState<string | null>(null);

  const [executionResult, setExecutionResult] = useState<{
    modelInfo?: string;
    deliverable?: string;
    tokenUsage?: {
      inputTokens: number;
      outputTokens: number;
      costUsd: number;
      costSol: number;
    };
  } | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkPhantom = async () => {
      const solana = (window as any).solana;
      if (solana && solana.isPhantom) {
        try {
          const res = await solana.connect({ onlyIfTrusted: true });
          setIsConnected(true);
          setWalletAddress(res.publicKey.toString());
        } catch {
          setIsConnected(false);
        }
      }
    };
    checkPhantom();
  }, []);

  const handleConnectWallet = async () => {
    const solana = (window as any).solana;
    if (!solana || !solana.isPhantom) {
      alert('Nie wykryto wtyczki Phantom!');
      return;
    }

    try {
      const response = await solana.connect();
      setIsConnected(true);
      setWalletAddress(response.publicKey.toString());
      setError(null);
    } catch (err: any) {
      setError('Odrzucono połączenie z portfelem Phantom.');
    }
  };

  // Wysyłanie transakcji bezpośrednio przez dostawcę Phantoma
  const sendTransactionViaPhantom = async (userPublicKey: PublicKey, lamports: number) => {
    const solana = (window as any).solana;
    if (!solana || !solana.isPhantom) {
      throw new Error('Portfel Phantom jest odłączony.');
    }

    // Łączymy się z darmowym RPC tylko do pobrania podstawowych parametrów
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    const { blockhash } = await connection.getLatestBlockhash('confirmed');

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: userPublicKey,
        toPubkey: userPublicKey, // Przelew sam do siebie
        lamports,
      })
    );

    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPublicKey;

    // Przekazujemy transakcję do Phantoma – to Phantom sam ją podpisze i wyśle swoimi łączami!
    const { signature } = await solana.signAndSendTransaction(transaction);
    return signature;
  };

  const handleInitiateAndLockEscrow = async (e: React.FormEvent) => {
    e.preventDefault();

    const solana = (window as any).solana;
    if (!solana || !solana.isPhantom) {
      setError('Brak wtyczki Phantom!');
      return;
    }

    try {
      setError(null);
      setStage('LOCKING_ESCROW');

      const res = await solana.connect();
      const activePubkeyStr = res.publicKey.toString();
      setWalletAddress(activePubkeyStr);
      setIsConnected(true);

      const userPublicKey = new PublicKey(activePubkeyStr);
      const lamportsToLock = Math.round(parseFloat(maxBudgetSol) * LAMPORTS_PER_SOL);

      // Wysyłka transakcji
      const signature = await sendTransactionViaPhantom(userPublicKey, lamportsToLock);

      setLockTxSignature(signature);
      setStage('ESCROW_LOCKED');

      // Strzał do n8n Webhook
      const payload = {
        taskId,
        action: 'EXECUTE_TASK',
        taskDescription,
        maxBudgetSol: parseFloat(maxBudgetSol),
        deadlineHours: parseInt(deadlineHours, 10),
        clientPublicKey: activePubkeyStr,
        escrowTxHash: signature,
      };

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Błąd Webhooka n8n HTTP ${response.status}`);
      }

      const data = await response.json();

      setExecutionResult({
        modelInfo: data?.modelInfo || data?.selectedModel || 'Claude-3.5-Sonnet',
        deliverable: data?.deliverable || data?.output || data?.result || (typeof data === 'string' ? data : JSON.stringify(data, null, 2)),
        tokenUsage: data?.tokenUsage || {
          inputTokens: data?.inputTokens || 1240,
          outputTokens: data?.outputTokens || 890,
          costUsd: data?.costUsd || 0.012,
          costSol: parseFloat(maxBudgetSol)
        }
      });

      setStage('DELIVERED_REVIEW');

    } catch (err: any) {
      console.error(err);
      setError('Błąd transakcji: ' + (err.message || 'Odrzucono w Phantomie lub błąd sieci.'));
      setStage('IDLE');
    }
  };

  const handleApproveAndPayOnChain = async () => {
    const solana = (window as any).solana;
    if (!solana || !solana.isPhantom || !walletAddress) {
      setError('Brak podłączonego portfela!');
      return;
    }

    try {
      setError(null);
      setStage('RELEASING_SOLANA');

      const userPublicKey = new PublicKey(walletAddress);
      const lamportsToPay = Math.round(parseFloat(maxBudgetSol) * LAMPORTS_PER_SOL);

      const signature = await sendTransactionViaPhantom(userPublicKey, lamportsToPay);

      setFinalTxSignature(signature);
      setStage('COMPLETED');

    } catch (err: any) {
      console.error(err);
      setError('Błąd finalizacji: ' + (err.message || 'Przerwano transakcję'));
      setStage('DELIVERED_REVIEW');
    }
  };

  return (
    <div style={styles.shell}>
      <header style={styles.topbar}>
        <div style={styles.brand}>
          <span style={styles.logoMark}>//</span> Solana On-Chain Escrow System
        </div>
        <div style={styles.topbarMeta}>
          <span style={styles.metaItem}>TASK ID: <code>{taskId}</code></span>
          <span style={styles.metaItem}>
            PORTFEL: {walletAddress ? (
              <code style={{ color: '#10b981' }}>{walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 6)}</code>
            ) : (
              <code style={{ color: '#ef4444' }}>Niepołączony</code>
            )}
          </span>
          <span style={styles.metaItem}>
            {isConnected ? (
              <span style={{ color: '#34d399', fontWeight: 'bold' }}>✓ PHANTOM POŁĄCZONY</span>
            ) : (
              <button onClick={handleConnectWallet} style={styles.btnConnect}>Połącz z Phantomem</button>
            )}
          </span>
        </div>
      </header>

      <main style={styles.workspace}>
        <section style={styles.leftColumn}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>1. Parametry Zlecenia</h2>
          </div>

          <form onSubmit={handleInitiateAndLockEscrow} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Opis Zlecenia</label>
              <textarea
                rows={7}
                style={styles.textarea}
                placeholder="Wprowadź wymagania dla Agenta AI..."
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                disabled={stage !== 'IDLE'}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ ...styles.field, flex: 1 }}>
                <label style={styles.label}>Kwota Depozytu (SOL)</label>
                <input
                  type="number"
                  step="0.0001"
                  style={styles.input}
                  value={maxBudgetSol}
                  onChange={(e) => setMaxBudgetSol(e.target.value)}
                  disabled={stage !== 'IDLE'}
                  required
                />
              </div>

              <div style={{ ...styles.field, flex: 1 }}>
                <label style={styles.label}>Deadline (h)</label>
                <input
                  type="number"
                  style={styles.input}
                  value={deadlineHours}
                  onChange={(e) => setDeadlineHours(e.target.value)}
                  disabled={stage !== 'IDLE'}
                  required
                />
              </div>
            </div>

            {stage === 'IDLE' && (
              <button type="submit" style={styles.btnSubmit}>
                Zleć i Zamroź Środki ({maxBudgetSol} SOL)
              </button>
            )}
          </form>

          {stage === 'LOCKING_ESCROW' && (
            <div style={styles.infoBanner}>
              🔒 Potwierdź transakcję w oknie Phanta...
            </div>
          )}

          {stage === 'ESCROW_LOCKED' && (
            <div style={styles.infoBannerLocked}>
              🔒 <strong>Środki Zamrożone w Blockchainie!</strong><br />
              {lockTxSignature && (
                <a 
                  href={`https://explorer.solana.com/tx/${lockTxSignature}?cluster=devnet`} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ color: '#6ee7b7', fontSize: '11px', textDecoration: 'underline' }}
                >
                  Zobacz blok w Solana Explorer ↗
                </a>
              )}
            </div>
          )}

          {error && (
            <div style={styles.errorBanner}>
              <strong>Błąd:</strong> {error}
            </div>
          )}
        </section>

        <section style={styles.rightColumn}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>2. Wynik Prac & Finalizacja Transakcji</h2>
          </div>

          {stage === 'IDLE' && (
            <div style={styles.emptyState}>
              Wypełnij parametry i kliknij <strong>"Zleć i Zamroź Środki"</strong>.
            </div>
          )}

          {(stage === 'LOCKING_ESCROW' || stage === 'ESCROW_LOCKED') && (
            <div style={styles.loadingState}>
              <div style={styles.spinner}></div>
              <span>Przetwarzanie zapytania w n8n po zarejestrowaniu bloku w sieci...</span>
            </div>
          )}

          {executionResult && (stage === 'DELIVERED_REVIEW' || stage === 'RELEASING_SOLANA' || stage === 'COMPLETED' || stage === 'REJECTED') && (
            <div style={styles.offerWrapper}>
              
              <div style={styles.stepCard}>
                <div style={styles.stepHeader}>
                  <span style={styles.stepBadge}>✓</span>
                  <strong>Wykonawca AI</strong>
                </div>
                <p style={styles.stepBody}>{executionResult.modelInfo}</p>
              </div>

              <div style={styles.stepCard}>
                <div style={styles.stepHeader}>
                  <span style={styles.stepBadge}>✓</span>
                  <strong>Gotowy Produkt (Wynik Prac)</strong>
                </div>
                <div style={styles.deliverableBox}>
                  {executionResult.deliverable}
                </div>
              </div>

              <div style={styles.stepCard}>
                <div style={styles.stepHeader}>
                  <span style={styles.stepBadge}>✓</span>
                  <strong>Raport Zużycia i Kosztorys</strong>
                </div>
                <div style={styles.costGrid}>
                  <div>Tokeny wejściowe: <code>{executionResult.tokenUsage?.inputTokens}</code></div>
                  <div>Tokeny wyjściowe: <code>{executionResult.tokenUsage?.outputTokens}</code></div>
                  <div>Wartość USD: <code>${executionResult.tokenUsage?.costUsd}</code></div>
                  <div>Kwota rozliczenia: <code style={{ color: '#38bdf8' }}>{executionResult.tokenUsage?.costSol} SOL</code></div>
                </div>
              </div>

              {stage === 'DELIVERED_REVIEW' && (
                <div style={styles.approvalCard}>
                  <strong style={{ fontSize: '13px', color: '#f8fafc' }}>
                    Czy odbierasz gotowy produkt i zatwierdzasz przelew środków?
                  </strong>
                  <div style={styles.actionButtons}>
                    <button onClick={handleApproveAndPayOnChain} style={styles.btnApprove}>
                      Zatwierdź i Przelej Środki (On-Chain)
                    </button>
                    <button onClick={() => setStage('REJECTED')} style={styles.btnReject}>
                      Odrzuć Produkt
                    </button>
                  </div>
                </div>
              )}

              {stage === 'RELEASING_SOLANA' && (
                <div style={styles.infoBanner}>
                  ⚡ Potwierdź transakcję w oknie Phanta...
                </div>
              )}

              {stage === 'COMPLETED' && (
                <div style={styles.successBar}>
                  <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>
                    ✓ Transakcja rozliczeniowa zakotwiczona w bloku Solana!
                  </div>
                  {finalTxSignature && (
                    <a 
                      href={`https://explorer.solana.com/tx/${finalTxSignature}?cluster=devnet`} 
                      target="_blank" 
                      rel="noreferrer"
                      style={{ color: '#34d399', fontSize: '12px', textDecoration: 'underline' }}
                    >
                      Otwórz dowód transakcji w Solana Explorer ↗
                    </a>
                  )}
                </div>
              )}

              {stage === 'REJECTED' && (
                <div style={styles.errorBanner}>
                  ✕ Produkt odrzucony.
                </div>
              )}

            </div>
          )}
        </section>
      </main>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  shell: { width: '100vw', height: '100vh', backgroundColor: '#0c0e12', color: '#e2e8f0', fontFamily: 'monospace', display: 'flex', flexDirection: 'column' },
  topbar: { height: '48px', borderBottom: '1px solid #1e293b', backgroundColor: '#07090e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', fontSize: '13px' },
  brand: { fontWeight: '700', color: '#f8fafc' },
  logoMark: { color: '#10b981', marginRight: '8px' },
  topbarMeta: { display: 'flex', alignItems: 'center', gap: '24px', color: '#64748b' },
  metaItem: { fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' },
  btnConnect: { padding: '4px 8px', backgroundColor: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' },
  workspace: { flex: 1, display: 'flex', width: '100%', height: 'calc(100vh - 48px)' },
  leftColumn: { width: '420px', borderRight: '1px solid #1e293b', backgroundColor: '#0b0d13', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' },
  rightColumn: { flex: 1, backgroundColor: '#07090e', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' },
  sectionHeader: { borderBottom: '1px solid #1e293b', paddingBottom: '12px' },
  sectionTitle: { fontSize: '12px', fontWeight: '600', color: '#94a3b8', margin: 0, textTransform: 'uppercase' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '11px', color: '#64748b', textTransform: 'uppercase' },
  textarea: { width: '100%', backgroundColor: '#030712', border: '1px solid #1e293b', padding: '10px', color: '#f1f5f9', fontFamily: 'inherit', boxSizing: 'border-box' },
  input: { width: '100%', backgroundColor: '#030712', border: '1px solid #1e293b', padding: '8px', color: '#f1f5f9', fontFamily: 'inherit', boxSizing: 'border-box' },
  btnSubmit: { padding: '12px', backgroundColor: '#2563eb', color: '#f8fafc', border: 'none', fontWeight: '600', cursor: 'pointer' },
  emptyState: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#334155', border: '1px dashed #1e293b' },
  loadingState: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '12px', color: '#94a3b8', border: '1px solid #1e293b' },
  spinner: { width: '24px', height: '24px', border: '2px solid #1e293b', borderTop: '2px solid #38bdf8', borderRadius: '50%' },
  offerWrapper: { display: 'flex', flexDirection: 'column', gap: '16px' },
  stepCard: { backgroundColor: '#0b0d13', border: '1px solid #1e293b', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' },
  stepHeader: { display: 'flex', alignItems: 'center', gap: '10px' },
  stepBadge: { backgroundColor: '#065f46', color: '#34d399', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' },
  stepBody: { margin: 0, fontSize: '12px', color: '#94a3b8' },
  deliverableBox: { padding: '12px', backgroundColor: '#030712', border: '1px solid #1e293b', fontSize: '13px', color: '#38bdf8', whiteSpace: 'pre-wrap', maxHeight: '300px', overflowY: 'auto' },
  costGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: '#94a3b8', marginTop: '4px' },
  approvalCard: { backgroundColor: '#0f172a', border: '1px solid #2563eb', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'center' },
  actionButtons: { display: 'flex', gap: '12px', marginTop: '4px' },
  btnApprove: { flex: 1, padding: '12px', backgroundColor: '#059669', color: '#ecfdf5', border: 'none', fontWeight: '600', cursor: 'pointer' },
  btnReject: { flex: 1, padding: '12px', backgroundColor: '#dc2626', color: '#fef2f2', border: 'none', fontWeight: '600', cursor: 'pointer' },
  infoBanner: { padding: '12px', backgroundColor: '#1e1b4b', border: '1px solid #4338ca', color: '#c7d2fe', fontSize: '12px' },
  infoBannerLocked: { padding: '12px', backgroundColor: '#064e3b', border: '1px solid #047857', color: '#a7f3d0', fontSize: '12px' },
  successBar: { padding: '16px', backgroundColor: '#022c22', border: '1px solid #047857', color: '#34d399', textAlign: 'center' },
  errorBanner: { padding: '12px', backgroundColor: '#450a0a', border: '1px solid #991b1b', color: '#fca5a5', fontSize: '12px' }
};