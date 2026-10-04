# Solana On-Chain Escrow & Multi-Agent AI Settlement

Zdecentralizowany system rozliczeniowy (Escrow) dla autonomicznych agentów AI, oparty na blockchainie **Solana** oraz automatyzacji w **n8n**. Projekt eliminuje ryzyko kontrahenta w relacjach Machine-to-Machine (M2M) poprzez kryptograficzne blokady środków i weryfikację wykonania zadań przez modele językowe (LLM).

---

## 🏗️ Architektura Systemu

1. **Inicjalizacja i Blokada (Lock):** Klient definiuje parametry zadania (budżet w SOL, deadline) i blokuje środki w bezpiecznym depozycie on-chain na sieci Solana (`REAL_LOCK_TX_HASH`).
2. **Wykonanie zadania (n8n Webhook):** Po potwierdzeniu blokady aplikacja wysyła payload przez webhook do n8n, gdzie agent AI przetwarza zadanie, generuje wynik i raportuje zużycie tokenów.
3. **Weryfikacja i Rozliczenie (Settlement):** Klient weryfikuje dostarczony wynik w interfejsie React i zatwierdza ostateczny przelew środków (`REAL_FINAL_TX_HASH`).

---

## 🛠️ Wymagania Wstępne i Narzędzia

Zanim zaczniesz, upewnij się, że masz zainstalowane i skonfigurowane następujące narzędzia:

* **Node.js** (wersja 18+ lub nowsza) – [Pobierz Node.js](https://nodejs.org/)
* **Git** – [Pobierz Gita](https://git-scm.com/)
* **Portfel Phantom** (rozszerzenie do przeglądarki Chrome/Brave/Firefox) – [Pobierz Phantom](https://phantom.app/)
  * *Ważne:* Przełącz sieć w portfelu Phantom na **Devnet** (Ustawienia -> Developer Settings -> Change Network -> Devnet), aby móc testować transakcje bez użycia prawdziwych środków.
  * *Fauset:* Zaopatrz się w testowe SOL na Devnecie (np. przez `solana airdrop` z poziomu Solana CLI lub darmowe kranu online typu *Solana Faucet*), aby móc opłacać transakcje on-chain.
* **Solana CLI** (opcjonalnie, do zarządzania kluczami i transakcjami z poziomu terminala)
* Aktywna instancja **n8n** z skonfigurowanym webhookiem nasłuchującym (`/webhook/agent-negotiate`).

---

## 🚀 Instrukcja Uruchomienia Krok po Kroku

### 1. Sklonowanie repozytorium
Otwórz terminal i wpisz poniższe polecenia, aby pobrać projekt na swój komputer:
```bash
git clone [https://github.com/TWOJA_NAZWA_UZYTKOWNIKA/TWOJE_REPO.git](https://github.com/TWOJA_NAZWA_UZYTKOWNIKA/TWOJE_REPO.git)
cd TWOJE_REPO
