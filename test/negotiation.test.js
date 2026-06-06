const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdtempSync, writeFileSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { readEvents, readEventsAt } = require("../src/events");
const protocolSchema = require("../schemas/clista-protocol.schema.json");
const { verifyProtocolNegotiation } = require("../src/negotiation");
const { exportProtocol, projectEvents, selectThreadState } = require("../src/projector");
const { formatValidationErrors, validateEvents } = require("../src/validator");

const root = path.resolve(__dirname, "..");
const cliPath = path.join(root, "src", "cli.js");
const canonicalLog = path.join(root, ".clista", "events.ndjson");

test("negotiation check accepts current continuity packets as explicitly degraded", () => {
  const result = runCli(root, ["negotiation", "check", "--events", canonicalLog]);

  assert.equal(result.schema, "clista.negotiation.verify.v0");
  assert.equal(result.valid, true);
  assert.equal(result.status, "degraded");
  assert.equal(result.theorem, "protocol_negotiation = agree(exchange_terms, across_independent_contexts)");
  assert.equal(result.hardLaw, "agreement != governance merger");
  assert.equal(result.packetContext.sourceThreadId, "thd_thread_0001");
  assert.equal(result.authorityTransfer, false);
  assert.equal(result.governanceMerge, false);
  assert.equal(result.automaticAmendmentAdoption, false);
  assert.equal(result.exchangeTerms.explicitReviewRequired, true);
});

test("negotiation propose, list, show, and verify record exchange terms without authority transfer", () => {
  const packet = runCli(root, ["continuity", "export", "--events", canonicalLog]);
  const cwd = createNegotiationStore();
  const packetPath = writePacket(cwd, packet);

  const proposed = runCli(cwd, [
    "negotiation",
    "propose",
    "--thread",
    "thd_negotiation",
    "--packet",
    packetPath,
    "--summary",
    "Negotiate degraded exchange terms"
  ]);
  const listed = runCli(cwd, ["negotiation", "list", "--thread", "thd_negotiation"]);
  const shown = runCli(cwd, ["negotiation", "show", proposed.negotiationRequest.id]);
  const verified = runCli(cwd, ["negotiation", "verify"]);

  assert.equal(proposed.proposed, true);
  assert.equal(proposed.negotiationTerms.status, "proposed");
  assert.equal(proposed.negotiationTerms.authorityTransfer, false);
  assert.equal(proposed.negotiationTerms.governanceMerge, false);
  assert.equal(proposed.negotiationTerms.automaticAmendmentAdoption, false);
  assert.equal(listed.count, 1);
  assert.equal(shown.request.id, proposed.negotiationRequest.id);
  assert.equal(shown.terms[0].id, proposed.negotiationTerms.id);
  assert.equal(verified.valid, true);
  assert.equal(verified.negotiationValidationStatus.termsCount, 1);
});

test("negotiation rejects required capability, amendment, validation, and semantic differences", () => {
  const packet = runCli(root, ["continuity", "export", "--events", canonicalLog]);
  const tampered = clone(packet);
  tampered.capability_set.push("remote_only_scheduler");
  tampered.continuity_state.amendment_state.activeAmendments.push({ id: "amd_remote_threshold" });
  tampered.verification_state.requiredLayers.push("source_reputation");
  tampered.interoperability_profile.requiredSemantics.push("source_reputation");

  const result = verifyProtocolNegotiation(tampered, {
    continuityVerification: { valid: true },
    compatibilityResult: { valid: false, status: "incompatible", reasons: [] },
    interoperabilityResult: { valid: false, status: "incompatible", reasons: [] },
    federationResult: { valid: false, status: "rejected", reasons: [] }
  });
  const types = new Set(result.differences.map((item) => item.differenceType));

  assert.equal(result.valid, false);
  assert.equal(result.status, "rejected");
  assert.equal(types.has("capability"), true);
  assert.equal(types.has("amendment"), true);
  assert.equal(types.has("validation_requirement"), true);
  assert.equal(types.has("interoperability_profile"), true);
  assert.match(JSON.stringify(result.reasons), /unsupported required capability remote_only_scheduler/);
  assert.match(JSON.stringify(result.reasons), /compatibility check is not valid/);
});

test("negotiation degrades optional unsupported capabilities and semantics explicitly", () => {
  const packet = runCli(root, ["continuity", "export", "--events", canonicalLog]);
  const tampered = clone(packet);
  tampered.optional_capability_set = ["remote_optional_scheduler"];
  tampered.interoperability_profile.optionalSemantics = ["remote_optional_semantic"];

  const result = verifyProtocolNegotiation(tampered, {
    continuityVerification: { valid: true },
    compatibilityResult: { valid: true, status: "degraded", reasons: [] },
    interoperabilityResult: { valid: true, status: "degraded", reasons: [] },
    federationResult: { valid: true, status: "degraded", reasons: [] }
  });

  assert.equal(result.valid, true);
  assert.equal(result.status, "degraded");
  assert.match(JSON.stringify(result.degradations), /unsupported optional capability remote_optional_scheduler/);
  assert.match(JSON.stringify(result.degradations), /unsupported optional semantic remote_optional_semantic/);
});

test("negotiation check exits non-zero when a required prior gate fails", () => {
  const packet = runCli(root, ["continuity", "export", "--events", canonicalLog]);
  const tampered = clone(packet);
  tampered.verification_state.requiredLayers.push("source_reputation");
  const cwd = createNegotiationStore();
  const packetPath = writePacket(cwd, tampered, "required-gate-failure.json");
  const result = runCliResult(cwd, ["negotiation", "check", "--packet", packetPath]);
  const checked = JSON.parse(result.stdout);

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.equal(checked.valid, false);
  assert.equal(checked.status, "rejected");
  assert.match(JSON.stringify(checked.reasons), /source_reputation/);
});

test("negotiation validation rejects authority transfer and automatic amendment adoption", () => {
  const cwd = createNegotiationStore();
  const events = [
    ...readEvents(cwd),
    ...negotiationLifecycleEvents({
      termsStatus: "accepted",
      eventType: "NegotiationTermsAccepted",
      extraTerms: {
        authorityTransfer: true,
        governanceMerge: true,
        automaticAmendmentAdoption: true
      }
    })
  ];
  const validation = validateEvents(events);
  const message = formatValidationErrors(validation.errors);

  assert.equal(validation.valid, false);
  assert.match(message, /negotiation field authorityTransfer must be false/);
  assert.match(message, /negotiation field governanceMerge must be false/);
  assert.match(message, /negotiation field automaticAmendmentAdoption must be false/);
});

test("accepted, rejected, and degraded negotiation terms project deterministically", () => {
  const cwd = createNegotiationStore();
  const events = [
    ...readEvents(cwd),
    ...negotiationLifecycleEvents({
      negotiationId: "ngn_accept",
      termsId: "ngt_accept",
      termsStatus: "accepted",
      eventType: "NegotiationTermsAccepted"
    }),
    ...negotiationLifecycleEvents({
      negotiationId: "ngn_reject",
      termsId: "ngt_reject",
      termsStatus: "rejected",
      eventType: "NegotiationTermsRejected"
    }),
    ...negotiationLifecycleEvents({
      negotiationId: "ngn_degrade",
      termsId: "ngt_degrade",
      termsStatus: "degraded",
      eventType: "NegotiationDegradationAccepted"
    })
  ];
  const validation = validateEvents(events);
  const first = projectEvents(events).negotiation;
  const second = projectEvents(events).negotiation;
  const exported = exportProtocol(projectEvents(readEventsAt(canonicalLog)));
  const threadState = selectThreadState(projectEvents(events), "thd_negotiation");

  assert.equal(validation.valid, true, formatValidationErrors(validation.errors));
  assert.deepEqual(first, second);
  assert.equal(first.acceptedTerms.length, 1);
  assert.equal(first.rejectedTerms.length, 1);
  assert.equal(first.degradedTerms.length, 1);
  assert.equal(exported.negotiation.hardLaw, "agreement != governance merger");
  assert.equal(threadState.reasoningState.negotiation.acceptedTerms.length, 1);
});

test("export schema defines negotiation records and exported negotiation records satisfy it", () => {
  const packet = runCli(root, ["continuity", "export", "--events", canonicalLog]);
  const cwd = createNegotiationStore();
  const packetPath = writePacket(cwd, packet);

  runCli(cwd, [
    "negotiation",
    "propose",
    "--thread",
    "thd_negotiation",
    "--packet",
    packetPath,
    "--summary",
    "Propose structurally valid exchange terms"
  ]);
  const exported = runCli(cwd, ["export"]);
  const projectionSchema = protocolSchema.$defs.negotiationProjection;

  assert.deepEqual(protocolSchema.$defs.negotiationStatus.enum, [
    "proposed",
    "accepted",
    "degraded",
    "rejected"
  ]);
  assert.equal(projectionSchema.properties.requests.items.$ref, "#/$defs/negotiationRequest");
  assert.equal(projectionSchema.properties.differences.items.$ref, "#/$defs/negotiationDifference");
  assert.equal(projectionSchema.properties.terms.items.$ref, "#/$defs/negotiationTerms");
  assert.equal(projectionSchema.properties.failures.items.$ref, "#/$defs/negotiationFailure");
  assertRecordMatchesDefinition(protocolSchema.$defs.negotiationRequest, exported.negotiation.requests[0]);
  assertRecordMatchesDefinition(protocolSchema.$defs.negotiationTerms, exported.negotiation.terms[0]);
});

function createNegotiationStore() {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "clista-negotiation-"));
  runCli(cwd, ["init"]);
  runCli(cwd, [
    "thread",
    "create",
    "--id",
    "thd_negotiation",
    "--title",
    "Negotiation Thread",
    "--question",
    "Can contexts agree on exchange terms without governance merger?",
    "--participant",
    "Troy:decision owner"
  ]);
  return cwd;
}

function negotiationLifecycleEvents(options = {}) {
  const negotiationId = options.negotiationId || "ngn_terms";
  const termsId = options.termsId || "ngt_terms";
  const at = "2026-06-06T00:00:00.000Z";
  return [
    {
      event_id: `evt_${negotiationId}`,
      event_type: "NegotiationRequested",
      thread_id: "thd_negotiation",
      actor_id: "par_troy",
      timestamp: at,
      payload: {
        negotiationRequest: {
          id: negotiationId,
          object: "negotiationRequest",
          threadId: "thd_negotiation",
          packetHash: `sha256:${"a".repeat(64)}`,
          status: "proposed",
          authorityTransfer: false,
          governanceMerge: false,
          automaticAmendmentAdoption: false
        }
      }
    },
    {
      event_id: `evt_${termsId}`,
      event_type: options.eventType,
      thread_id: "thd_negotiation",
      actor_id: "par_troy",
      timestamp: at,
      payload: {
        negotiationTerms: {
          id: termsId,
          object: "negotiationTerms",
          negotiationId,
          threadId: "thd_negotiation",
          status: options.termsStatus,
          summary: `${options.termsStatus} exchange terms`,
          exchangeTerms: {
            authorityTransfer: false,
            governanceMerge: false,
            automaticAmendmentAdoption: false,
            silentDowngrade: false
          },
          authorityTransfer: false,
          governanceMerge: false,
          automaticAmendmentAdoption: false,
          ...options.extraTerms
        }
      }
    }
  ];
}

function runCli(cwd, args) {
  const result = runCliResult(cwd, args);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

function runCliResult(cwd, args) {
  return spawnSync("node", [cliPath, ...args], { cwd, encoding: "utf8" });
}

function writePacket(cwd, packet, name = "continuity.json") {
  const packetPath = path.join(cwd, name);
  writeFileSync(packetPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
  return packetPath;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertRecordMatchesDefinition(definition, record) {
  assert.ok(record);
  for (const field of definition.required || []) {
    assert.ok(Object.hasOwn(record, field), `${record.object || "record"} missing ${field}`);
  }
  for (const [field, property] of Object.entries(definition.properties || {})) {
    if (!Object.hasOwn(record, field)) {
      continue;
    }
    if (Object.hasOwn(property, "const")) {
      assert.equal(record[field], property.const);
    }
    if (property.$ref === "#/$defs/negotiationStatus") {
      assert.ok(protocolSchema.$defs.negotiationStatus.enum.includes(record[field]));
    }
    if (property.pattern) {
      assert.match(record[field], new RegExp(property.pattern));
    }
    if (property.minLength) {
      assert.ok(String(record[field]).length >= property.minLength);
    }
  }
}
