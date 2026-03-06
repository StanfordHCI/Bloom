library(pwr)
library(tidyverse)

## Sensitivity Analysis
ds <- c(0.3, 0.5, 0.8)

## ---- H1: study > baseline (paired) ----
h1_required <- sapply(ds, function(d) {
  out <- pwr.t.test(
    d = d,
    sig.level = 0.05,
    power = 0.80,
    type = "paired"
  )
  ceiling(out$n)     # participants needed (pairs)
})

## ---- H2: treatment > control (two-sample) ----
h2_required_per_group <- sapply(ds, function(d) {
  out <- pwr.t.test(
    d = d,
    sig.level = 0.05,
    power = 0.80,
    type = "two.sample"
  )
  ceiling(out$n)   # n per group
})

h2_required_total <- 2 * h2_required_per_group

## ---- Minimally Detectable Effects ----

# H1 MDES
h1_mdes <- pwr.t.test(
  n = 54,
  sig.level = 0.05,
  power = 0.80,
  type = "paired"
)$d

# H2 MDES
h2_mdes <- pwr.t.test(
  n = 27,
  sig.level = 0.05,
  power = 0.80,
  type = "two.sample"
)$d

## ---- Build Table ----

results_table <- tibble(
  Effect_Size_d = ds,
  H1_N_required_paired = h1_required,
  H2_N_required_per_group = h2_required_per_group,
  H2_N_required_total = h2_required_total
)

mdes_table <- tibble(
  Contrast = c("H1 (paired)", "H2 (two-sample)"),
  N = c(54, 27),
  MDES_d = c(h1_mdes, h2_mdes)
)

## Print tables
cat("\n==== Sample Size Required for 80% Power (Two-Sided, α = .05) ====\n")
print(results_table)

cat("\n==== Minimally Detectable Effect Sizes (Given N) ====\n")
print(mdes_table)
