# ObjectScript Rules for AI Agents

These rules are CRITICAL and must be embedded in all codegen and validation agent prompts.
Derived from real-world experience migrating 30+ HL7 flows to IRIS/TrackCare.

---

## NEVER Do These (will cause runtime errors)

### 1. `Quit "value"` inside Try blocks
**Error:** ERROR #1043
**Rule:** Use `Set tResult = "value"` then `Quit` outside the Try.
```objectscript
// WRONG
Try {
    Quit "some value"  ;; ERROR #1043
}

// CORRECT
Try {
    Set tResult = "some value"
}
Catch ex {
    Set tResult = "error"
}
Quit tResult
```

### 2. Underscores in variable names
**Error:** `_` is the concatenation operator in ObjectScript.
**Rule:** Use camelCase: `tPV2032` not `tPV2_03_2`.
```objectscript
// WRONG
Set tPV2_03_2 = "value"  ;; This concatenates tPV2 with "03" with 2

// CORRECT
Set tPV2032 = "value"
```

### 3. `New $NAMESPACE` inside Try
**Error:** Scopes to method level, never restores on error.
**Rule:** Always save/restore explicitly.
```objectscript
// WRONG
Try {
    New $NAMESPACE
    Set $NAMESPACE = "OTHERNAMESPACE"
}

// CORRECT
Set tOrigNS = $NAMESPACE
Try {
    Set $NAMESPACE = "OTHERNAMESPACE"
    // ... work ...
    Set $NAMESPACE = tOrigNS
}
Catch ex {
    Set $NAMESPACE = tOrigNS
    // handle error
}
```

### 4. SetValueAt for building messages
**Error:** Fails after DTL/reimport without DocType.
**Rule:** Build raw strings field-by-field.
```objectscript
// WRONG
Do tMsg.SetValueAt("value", "PID:5.1")

// CORRECT
Set tNewPID = "PID" _ "|" _ field1 _ "|" _ field2 _ "|" _ ...
```

### 5. GetValueAt for PID/PV1/PV2 extraction
**Error:** Fails silently when message lacks EVN segment (common with SAP).
**Rule:** Use RawParser. Only use GetValueAt for MSH fields.

---

## Mandatory Patterns

### Try/Catch with namespace save/restore
Every method that changes namespace must save and restore in BOTH Try and Catch.

### Logging
Use `$$$LOGINFO()` and `$$$LOGERROR()` only in the correct production namespace.

### Building HL7 Messages
```objectscript
Set tMsg = "MSH|^~\&|..." _ $C(13) _ "EVN|..." _ $C(13) _ "PID|..." _ $C(13) _ "PV1|..."
```
- Segment separator: `$CHAR(13)` (CR)
- Set DocType AFTER `ImportFromString` (for Visual Trace only)
- Normalize line endings: `$TRANSLATE(msg, $CHAR(10), $CHAR(13))` then `$REPLACE(msg, $CHAR(13,13), $CHAR(13))`

### RawParser Usage
- `ExtractSegment("msg", "PID")` returns content WITHOUT "PID|" prefix
- `GetField(seg, N)` = `$PIECE(seg, "|", N)` = PID.N (direct mapping, no offset)
- For building output from raw lines: `$PIECE(line, "|", N+1)` = PID.N (because line includes "PID|")

### HTTP/SOAP
- `SendFormDataArray` ignores custom headers — use `%Net.HttpRequest.Post()` directly
- SAP PI requires Pre-emptive Basic Auth — `Authorization: Basic <b64>` header directly
- Email: `%Net.SMTP` directly (not `EnsLib.EMail.OutboundAdapter`)

### Multi-OBR Messages
- `ParseHL7Field`/`GetHL7Value` only return FIRST match — use `ByIndex` versions
- `CountHL7Segments(msg, "OBR")` to count groups
- In BPL: `<while>` loop. In ObjectScript: `For tIdx = 1:1:tCount`

---

## IRIS Class Types and Their Base Classes

| Type | Base Class | Purpose |
|------|-----------|---------|
| Business Service (TCP/MLLP) | `EnsLib.HL7.Service.TCPService` | Receive HL7 via MLLP |
| Business Service (HTTP) | `EnsLib.HTTP.Service` | Receive HTTP/SOAP |
| Business Process | `Ens.BusinessProcessBPL` or `Ens.BusinessProcess` | Routing/transformation logic |
| Business Operation (SOAP) | `Ens.BusinessOperation` | Call external SOAP services |
| Business Operation (HL7) | `EnsLib.HL7.Operation.TCPOperation` | Send HL7 via MLLP |
| DTL | `Ens.DataTransformDTL` | Data transformations |
| Message | `Ens.Request` / `Ens.Response` | Custom message classes |
| Production | `Ens.Production` | Container for all components |

## Compilation Order (dependency resolution)
1. Framework/Common (Utils, RawParser)
2. Messages (MSG, custom request/response)
3. Business Operations (BO)
4. Business Processes (BP)
5. Business Services (BS)
6. DTL Transformations
7. Production.cls (last)
