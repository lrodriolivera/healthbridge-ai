# ObjectScript Validation Rules

## Critical Errors (block deployment)

| ID | Rule | Pattern to Detect | Fix |
|----|------|-------------------|-----|
| E001 | No Quit "value" in Try | `Quit "..."` inside Try block | Use Set tResult then Quit outside |
| E002 | No underscores in variables | `tVarName_with_underscores` | Use camelCase: tVarNameWithUnderscores |
| E003 | No New $NAMESPACE in Try | `New $NAMESPACE` inside Try | Set tOrigNS = $NAMESPACE before Try |
| E004 | No hardcoded credentials | Passwords/tokens in code | Use Settings properties |
| E005 | Missing Try/Catch | Method without Try/Catch | Wrap in Try/Catch with namespace restore |

## Warnings (flag but allow deployment)

| ID | Rule | Pattern to Detect | Recommendation |
|----|------|-------------------|----------------|
| W001 | SetValueAt usage | `.SetValueAt(` | Prefer raw string concatenation |
| W002 | GetValueAt for non-MSH | `.GetValueAt("PID\|PV1\|PV2\|EVN\|OBR\|OBX")` | Use RawParser instead |
| W003 | Hardcoded URLs/IPs | `http://\d+\.\d+\.\d+\.\d+` | Use Settings properties |
| W004 | Missing logging | No $$$LOGINFO in method | Add entry/exit logging |
| W005 | SendFormDataArray | `SendFormDataArray` | Use %Net.HttpRequest.Post() directly |
| W006 | Missing namespace restore | Set $NAMESPACE without restore in Catch | Add restore in both Try and Catch |

## Info (suggestions)

| ID | Rule | Recommendation |
|----|------|----------------|
| I001 | Long method | Methods > 100 lines should be split |
| I002 | Missing description | Class should have /// description comment |
| I003 | Complex conditions | Nested If > 3 levels should be refactored |
