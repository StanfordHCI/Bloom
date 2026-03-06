library(nlme)
library(lme4)
library(lmerTest)
library(tidyverse)
library(glue)
library(effectsize)

df <- read_csv("data/daily_hk.csv", col_types = cols()) %>% 
  mutate(
    uid       = factor(uid),
    condition = if_else(group == "treatment", 1L, 0L),
    S         = if_else(day > 0, 1L, 0L),
    d_study   = if_else(day > 0, day, 0L),
    
    ## --- week and day-of-week ---
    week      = case_when(
      day <= 0 ~ 0L,
      TRUE     ~ ((day - 1L) %/% 7L) + 1L
    ) %>% factor(levels = 0:4),
    week_num  = as.integer(as.character(week)),
    
    dow_idx   = ((day - 1L) %% 7L + 7L) %% 7L + 1L,
    dow       = factor(
      dow_idx,
      levels = 1:7,
      labels = c("Sunday","Monday","Tuesday","Wednesday",
                 "Thursday","Friday","Saturday")
    )
  ) %>% 
  filter(day <= 28)

vars <- c(
  "hk_stepcount",
  "hk_activeenergyburned",
  "hk_appleexercisetime",
  "hk_distancewalkingrunning"
)

## container for all coefficient results
res <- list()

for (v in vars) {
  dat <- df %>%
    select(uid, condition, S, d_study, week, week_num, dow, day, y = all_of(v))
  
  ## --- baseline inclusion: >= 30 baseline days non-missing (same as before) ---
  keep_uid_baseline <- dat %>%
    filter(day <= 0) %>%
    group_by(uid) %>% 
    summarise(n_base = sum(!is.na(y)), .groups = "drop") %>% 
    filter(n_base >= 30) %>% 
    pull(uid)
  
  dat <- dat %>% filter(uid %in% keep_uid_baseline)
  
  ## --- study inclusion: exclude participants with >= 3 missing study days (days 1–28) ---
  keep_uid_study <- dat %>%
    filter(day >= 1, day <= 28) %>%
    group_by(uid) %>% 
    summarise(n_missing_study = sum(is.na(y)), .groups = "drop") %>% 
    filter(n_missing_study < 3) %>% 
    pull(uid) 
  
  dat <- dat %>% filter(uid %in% keep_uid_study)
  
  ## --- H1a: control group only ---
  dat_ctrl <- dat %>% filter(condition == 0L)
  fit_ctrl <- lme(
    y ~ S + S:week_num + dow,
    random   = ~ 1 | uid/week,
    weights  = varIdent(form = ~ 1 | uid),
    data     = dat_ctrl,
    method   = "REML",
    na.action = na.omit,
    control  = lmeControl(maxIter = 100,
                          msMaxIter = 300,
                          msMaxEval = 5000)
  )
  coefs_ctrl <- summary(fit_ctrl)$tTable
  t_val <- coefs_ctrl["S", "Value"] / coefs_ctrl["S", "Std.Error"]
  df_er <- coefs_ctrl["S", "DF"]
  d_val <- t_to_d(t_val, df_error = df_er, hedges.correction = FALSE)$d
  
  res[[length(res) + 1]] <- tibble(
    outcome    = v,
    hypothesis = "H1a",
    term       = "S",
    estimate   = coefs_ctrl["S", "Value"],
    se         = coefs_ctrl["S", "Std.Error"],
    df         = coefs_ctrl["S", "DF"],
    cohen_d    = d_val,
    p_raw      = coefs_ctrl["S", "p-value"]
  )
  
  ## --- H1b: treatment group only ---
  dat_trt <- dat %>% filter(condition == 1L)
  fit_trt <- lme(
    y ~ S + S:week_num + dow,
    random   = ~ 1 | uid/week,
    weights  = varIdent(form = ~ 1 | uid),
    data     = dat_trt,
    method   = "REML",
    na.action = na.omit,
    control  = lmeControl(maxIter = 100,
                          msMaxIter = 300,
                          msMaxEval = 5000)
  )
  coefs_trt <- summary(fit_trt)$tTable
  t_val <- coefs_trt["S", "Value"] / coefs_trt["S", "Std.Error"]
  df_er <- coefs_trt["S", "DF"]
  d_val <- t_to_d(t_val, df_error = df_er, hedges.correction = FALSE)$d
  
  res[[length(res) + 1]] <- tibble(
    outcome    = v,
    hypothesis = "H1b",
    term       = "S",
    estimate   = coefs_trt["S", "Value"],
    se         = coefs_trt["S", "Std.Error"],
    df         = coefs_trt["S", "DF"],
    cohen_d    = d_val,
    p_raw      = coefs_trt["S", "p-value"]
  )
  
  ## --- H2 & H3: full model with interactions ---
  fit <- lme(
    y ~ S + S:condition + S:week_num + S:condition:week_num + dow,
    random   = ~ 1 | uid/week,
    weights  = varIdent(form = ~ 1 | uid),
    data     = dat,
    method   = "REML",
    na.action = na.omit,
    control  = lmeControl(maxIter = 100,
                          msMaxIter = 300,
                          msMaxEval = 5000)
  )
  
  cat("\n--- Participant-level variance (3-level) ---\n")
  print(summary(fit))
  
  coefs  <- summary(fit)$tTable
  terms  <- c("S:condition", "S:condition:week_num")
  hypo   <- c("H2","H3")
  for (i in seq_along(terms)) {
    term <- terms[i]
    
    t_val <- coefs[term, "Value"] / coefs[term, "Std.Error"]
    df_er <- coefs[term, "DF"]
    d_val <- t_to_d(t_val, df_error = df_er, hedges.correction = FALSE)$d
    
    res[[length(res) + 1]] <- tibble(
      outcome    = v,
      hypothesis = hypo[i],
      term       = term,
      estimate   = coefs[term, "Value"],
      se         = coefs[term, "Std.Error"],
      df         = coefs[term, "DF"],
      cohen_d    = d_val,
      p_raw      = coefs[term, "p-value"]
    )
  }
  
  cat("\n\n")
}

results_df <- bind_rows(res) %>%
  mutate(p_holm = p.adjust(p_raw, method = "holm"))

print(results_df)
