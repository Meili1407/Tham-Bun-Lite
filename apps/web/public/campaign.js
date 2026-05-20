const caseId = window.location.pathname.split("/").filter(Boolean).pop();
const helperCopy = document.querySelector("#helper-copy");

const state = {
  case: null
};

const elements = {
  animalImage: document.querySelector("#animal-image"),
  statusPill: document.querySelector("#status-pill"),
  riskPill: document.querySelector("#risk-pill"),
  caseTitle: document.querySelector("#case-title"),
  providerName: document.querySelector("#provider-name"),
  amountRaised: document.querySelector("#amount-raised"),
  amountNeeded: document.querySelector("#amount-needed"),
  progressFill: document.querySelector("#progress-fill"),
  trustScore: document.querySelector("#trust-score"),
  escrowStatus: document.querySelector("#escrow-status"),
  providerWallet: document.querySelector("#provider-wallet"),
  contractAddress: document.querySelector("#contract-address"),
  txHash: document.querySelector("#tx-hash")
};

async function loadCase() {
  try {
    setHelper("Fetching case data...");
    const response = await fetch(`/api/cases/${caseId}`);
    if (!response.ok) {
      throw new Error("Case not found.");
    }

    state.case = await response.json();
    render();
    setHelper("PromptPay simulated for hackathon. Donations update the escrow state immediately.");
  } catch (error) {
    setHelper(error instanceof Error ? error.message : "Unable to load case.");
  }
}

async function donate(amount) {
  try {
    setButtonsDisabled(true);
    setHelper(`Submitting ${amount} THB donation...`);

    const response = await fetch(`/api/cases/${caseId}/donate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ amountThb: amount })
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? "Donation failed.");
    }

    state.case = payload.case;
    render();
    setHelper(`Donation accepted. Transaction hash: ${payload.txHash}`);
  } catch (error) {
    setHelper(error instanceof Error ? error.message : "Donation failed.");
  } finally {
    setButtonsDisabled(false);
  }
}

function render() {
  const currentCase = state.case;
  if (!currentCase) {
    return;
  }

  const percent = currentCase.amountNeeded > 0 ? Math.min(100, Math.round((currentCase.amountRaised / currentCase.amountNeeded) * 100)) : 0;
  const txHash = currentCase.releaseTxHash ?? currentCase.fundedTxHash ?? currentCase.createdTxHash ?? "Pending";

  elements.animalImage.src = currentCase.animalImageUrl || "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=80";
  elements.animalImage.alt = currentCase.title;
  elements.statusPill.textContent = currentCase.status;
  elements.riskPill.textContent = `${currentCase.fraudRisk} fraud risk`;
  elements.caseTitle.textContent = currentCase.title;
  elements.providerName.textContent = currentCase.providerName;
  elements.amountRaised.textContent = `${formatThb(currentCase.amountRaised)} THB`;
  elements.amountNeeded.textContent = `${formatThb(currentCase.amountNeeded)} THB`;
  elements.progressFill.style.width = `${percent}%`;
  elements.trustScore.textContent = `${currentCase.trustScore}/100`;
  elements.escrowStatus.textContent = currentCase.status;
  elements.providerWallet.textContent = currentCase.providerWallet;
  elements.contractAddress.textContent = currentCase.contractAddress ?? "Awaiting escrow";
  elements.txHash.textContent = txHash;
}

function setButtonsDisabled(disabled) {
  document.querySelectorAll(".button-grid button").forEach((button) => {
    button.disabled = disabled;
  });
}

function setHelper(text) {
  helperCopy.textContent = text;
}

function formatThb(amount) {
  return new Intl.NumberFormat("en-US").format(amount);
}

document.querySelectorAll(".button-grid button").forEach((button) => {
  button.addEventListener("click", async () => {
    if (!state.case) {
      return;
    }

    if (button.dataset.action === "full") {
      const remaining = Math.max(state.case.amountNeeded - state.case.amountRaised, 0);
      await donate(remaining || state.case.amountNeeded);
      return;
    }

    await donate(Number(button.dataset.amount));
  });
});

void loadCase();
