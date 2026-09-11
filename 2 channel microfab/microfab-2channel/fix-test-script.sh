#!/usr/bin/env bash
# ================================================================
# fix-test-script.sh
# Patches the 3 broken test calls in test-functional.sh
# Run from: ~/cip-2-test
# ================================================================

cd ~/cip-2-test

echo "Making backup of test-functional.sh..."
cp test-functional.sh test-functional.sh.backup
echo "✅ Backup saved as test-functional.sh.backup"

echo ""
echo "Applying fixes..."

# ----------------------------------------------------------------
# FIX 2: Change "RefundInvestment" → "Refund"
# The function in investcc is named "Refund" not "RefundInvestment"
# ----------------------------------------------------------------
sed -i 's/"RefundInvestment"/"Refund"/g' test-functional.sh
echo "✅ FIX 2: RefundInvestment → Refund"

# ----------------------------------------------------------------
# FIX 3: Change dispute resolution target
# ResolveDispute must be called on INVESTCC (investment-channel)
# not on govcc (gov-validation-channel)
# ----------------------------------------------------------------
# We need to look at what the test currently calls and fix it.
# First let's show what lines contain ResolveDispute:
echo ""
echo "Current ResolveDispute lines in test-functional.sh:"
grep -n "ResolveDispute" test-functional.sh

echo ""
echo "Now patching ResolveDispute to use investment-channel and investcc..."

# The test calls govcc's ResolveDispute — but govcc doesn't have that function.
# ResolveDispute lives in investcc on investment-channel.
# We need to change the channel and chaincode name for that specific call.
#
# Strategy: find the block that calls ResolveDispute and fix the channel + chaincode.
# The test uses variables like CHANNEL and CC_NAME around these calls.
# We do a targeted replacement:

python3 << 'PYEOF'
import re

with open("test-functional.sh", "r") as f:
    content = f.read()

# Pattern: any peer chaincode invoke line that mentions gov-validation-channel
# AND is within a few lines of ResolveDispute — replace just that one block.
#
# More surgical: find the exact line that invokes ResolveDispute on gov channel
# and switch it to investment-channel / investcc

# Replace the ResolveDispute invocation target
# Before (typical pattern):
#   -C gov-validation-channel -n govcc ... "ResolveDispute"
# After:
#   -C investment-channel -n investcc ... "ResolveDispute"

# Also fix the peerAddresses for that call to include all 4 peers
old_patterns = [
    # Pattern where ResolveDispute is called with gov channel
    (
        r'(-C\s+gov-validation-channel\s+-n\s+govcc[^\n]*\n(?:[^\n]*\n)*?[^\n]*"ResolveDispute")',
        lambda m: m.group(0)
            .replace('gov-validation-channel', 'investment-channel')
            .replace('-n govcc', '-n investcc')
    ),
    (
        r'(govcc[^\n]*"ResolveDispute")',
        lambda m: m.group(0).replace('govcc', 'investcc')
    ),
]

changed = False
for pattern, replacement in old_patterns:
    new_content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
    if new_content != content:
        content = new_content
        changed = True
        print(f"Applied pattern fix for ResolveDispute")

if not changed:
    print("WARNING: Could not auto-patch ResolveDispute.")
    print("You need to manually change it — see MANUAL FIX instructions below.")

with open("test-functional.sh", "w") as f:
    f.write(content)
PYEOF

echo ""
echo "Verifying fixes applied..."
echo ""
echo "--- All Refund calls (should say 'Refund' not 'RefundInvestment') ---"
grep -n "Refund" test-functional.sh | grep -v "^Binary"

echo ""
echo "--- All ResolveDispute calls (should be on investment-channel / investcc) ---"
grep -n "ResolveDispute" test-functional.sh

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  IF AUTO-PATCH DID NOT WORK — MANUAL FIX INSTRUCTIONS      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Open test-functional.sh in nano:"
echo "  nano test-functional.sh"
echo ""
echo "Find the TEST 5 — REFUND FLOW section."
echo "Change any line that says 'RefundInvestment' to 'Refund'"
echo ""
echo "Find the TEST 6 — DISPUTE FLOW section."
echo "Find the line that calls ResolveDispute."
echo "Change:  -C gov-validation-channel -n govcc"
echo "To:      -C investment-channel -n investcc"
echo "And add these peerAddresses if not already there:"
echo "  --peerAddresses investororgpeer-api.127-0-0-1.nip.io:9090"
echo ""
echo "Save with Ctrl+O, exit with Ctrl+X"
echo ""
echo "Then run the tests:"
echo "  ./test-functional.sh"
