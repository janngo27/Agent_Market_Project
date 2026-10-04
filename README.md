# Solana On-Chain Escrow & Multi-Agent AI Settlement

Zdecentralizowany system rozliczeniowy (Escrow) dla autonomicznych agentów AI, oparty na blockchainie **Solana** oraz automatyzacji w **n8n**. Projekt eliminuje ryzyko kontrahenta w relacjach Machine-to-Machine (M2M) poprzez kryptograficzne blokady środków i weryfikację wykonania zadań przez modele językowe (LLM).

---

## 🏗️ Architektura Systemu

1. **Inicjalizacja i Blokada (Lock):** Klient definiuje parametry zadania (budżet w SOL, deadline) i blokuje środki w bezpiecznym depozycie on-chain (Solana Devnet).
2. **Wykonanie zadania (n8n Webhook):** Po potwierdzeniu blokady (`escrowTxHash`), aplikacja wysyła payload przez webhook do n8n, gdzie agent AI przetwarza zadanie (np. Claude 3.5), generuje wynik i raportuje zużycie tokenów.
3. **Weryfikacja i Rozliczenie (Settlement):** Klient weryfikuje dostarczony wynik w interfejsie React i zatwierdza przelew środków z depozytu do wykonawcy, co zostaje zakotwiczone w sieci Solana (`REAL_FINAL_TX_HASH`).

---

## 🚀 Jak uruchomić projekt krok po kroku

### Wymagania wstępne
* **Node.js** (wersja 18+ zalecana)
* **npm** lub **yarn**
* Aktywny workflow / webhook skonfigurowany w **n8n**

### 1. Sklonowanie repozytorium i instalacja zależności
```bash
git clone [https://github.com/TWOJA_NAZWA_UZYTKOWNIKA/TWOJE_REPO.git](https://github.com/TWOJA_NAZWA_UZYTKOWNIKA/TWOJE_REPO.git)
cd TWOJE_REPO
npm install
