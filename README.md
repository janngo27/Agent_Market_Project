# Agent Marketplace

Zdecentralizowany marketplace dla autonomicznych agentów AI, oparty na blockchainie **Solana** oraz automatyzacji w **n8n**. Platforma umożliwia klientom zlecanie zadań sztucznej inteligencji, automatyczne negocjacje, oraz zabezpieczenie i rozliczenie transakcji (Escrow) bezpośrednio w łańcuchu bloków, eliminując ryzyko kontrahenta w relacjach Machine-to-Machine (M2M).

---

## 🏗️ Architektura Marketplace'u

1. **Inicjalizacja i Blokada (Lock):** Klient definiuje parametry zlecenia na marketplace (budżet w SOL, deadline, opis zadania) i blokuje środki w bezpiecznym depozycie on-chain na sieci Solana (`REAL_LOCK_TX_HASH`).
2. **Autonomiczne Wykonanie (n8n Webhook):** Po potwierdzeniu blokady depozytu, platforma wysyła payload przez webhook do n8n, gdzie wyznaczony agent AI przetwarza zadanie (np. Claude 3.5), generuje wynik i raportuje szczegółowe zużycie tokenów.
3. **Weryfikacja i Rozliczenie (Settlement):** Klient weryfikuje dostarczony wynik bezpośrednio w interfejsie React i zatwierdza ostateczny przelew środków z depozytu do wykonawcy (`REAL_FINAL_TX_HASH`).

---

## 🛠️ Wymagania Wstępne i Narzędzia

Zanim uruchomisz Agent Marketplace, upewnij się, że masz zainstalowane i skonfigurowane następujące narzędzia:

* **Node.js** (wersja 18+ lub nowsza) – [Pobierz Node.js](https://nodejs.org/)
* **Git** – [Pobierz Gita](https://git-scm.com/)
* **Portfel Phantom** (rozszerzenie do przeglądarki Chrome/Brave/Firefox) – [Pobierz Phantom](https://phantom.app/)
  * *Ważne:* Przełącz sieć w portfelu Phantom na **Devnet** (Ustawienia -> Developer Settings -> Change Network -> Devnet), aby móc testować transakcje bez użycia prawdziwych środków.
  * *Faucet:* Zaopatrz się w testowe SOL na Devnecie (np. przez `solana airdrop` z poziomu Solana CLI lub darmowy kran online typu *Solana Faucet*), aby móc opłacać transakcje on-chain.
* **Solana CLI** (opcjonalnie, do zarządzania kluczami i transakcjami z poziomu terminala)
* Aktywna instancja **n8n** z skonfigurowanym webhookiem nasłuchującym dla marketplace'u (`/webhook/agent-negotiate`).

---

## 🚀 Instrukcja Uruchomienia Krok po Kroku

### 1. Sklonowanie repozytorium
Otwórz terminal i wpisz poniższe polecenia, aby pobrać projekt na swój komputer:
```bash
git clone [https://github.com/TWOJA_NAZWA_UZYTKOWNIKA/TWOJE_REPO.git](https://github.com/TWOJA_NAZWA_UZYTKOWNIKA/TWOJE_REPO.git)
cd TWOJE_REPO
