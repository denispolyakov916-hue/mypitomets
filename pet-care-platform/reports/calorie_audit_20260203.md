## Calorie calculator audit

- Seed: `42`
- Scenarios: `20004`
- CSV: `D:\pet_develop\Pet_dev\pet-care-platform\reports\calorie_audit_20260203.csv`

### Summary
- **Within vet reference range**: 7026/20004
- **Simple status warn**: 3004/20004
- **Simple status critical**: 0/20004
- **Caps applied**: 10873/20004

### Top outliers (by |delta_vs_vet_mid_pct|)

|species|kg|age_m|neutered|act|bcs|repro|our_mer|vet_min..max|delta%|status|
|---|---:|---:|---|---|---:|---|---:|---:|---:|---|
|cat|2.6|3|True|very_high|5|none|143.3|286.7..430.0|-60.0|ok|
|dog|31.2|3|False|moderate|6|none|924.1|1848.2..2772.3|-60.0|ok|
|dog|41.2|3|False|moderate|5|none|1138.3|2276.7..3415.0|-60.0|ok|
|dog|34.7|6|True|low|6|none|1000.8|2001.6..3002.4|-60.0|ok|
|dog|11.9|6|True|low||none|448.5|897.0..1345.5|-60.0|ok|
|cat|2.9|6|True|very_low||none|155.6|311.1..466.7|-60.0|ok|
|cat|10.2|6|True|high|5|none|399.5|799.1..1198.6|-60.0|ok|
|cat|2.8|6|False|very_low|6|none|151.5|303.0..454.6|-60.0|ok|
|dog|54.9|3|False|very_low|4|none|1411.8|2823.6..4235.4|-60.0|ok|
|cat|6.1|3|True|low||none|271.7|543.4..815.1|-60.0|ok|
|cat|6.7|3|False|low||none|291.5|583.0..874.5|-60.0|ok|
|cat|7.0|3|False|low|4|none|301.2|602.5..903.7|-60.0|ok|
|cat|2.1|6|True|very_high|6|none|122.1|244.2..366.3|-60.0|ok|
|dog|67.0|3|False|very_high|5|none|1639.3|3278.6..4917.9|-60.0|ok|
|dog|29.5|6|False|low|4|none|886.1|1772.1..2658.2|-60.0|ok|
|dog|14.8|6|True|low|4|none|528.2|1056.4..1584.6|-60.0|ok|
|cat|5.8|3|True|high|5|none|261.6|523.2..784.9|-60.0|ok|
|dog|26.9|6|False|low|4|none|826.8|1653.6..2480.5|-60.0|ok|
|cat|11.1|3|True|moderate|4|none|425.7|851.4..1277.1|-60.0|ok|
|dog|42.0|3|True|high|5|none|1154.9|2309.8..3464.6|-60.0|ok|

### Notes
- Vet reference is a **range** from public clinical guidance (RER×factor); it is not a single truth.
- Individual needs can differ materially; BCS and weight trend should drive final adjustment.
