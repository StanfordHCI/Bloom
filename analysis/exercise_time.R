library(tidyverse)
library(glue)

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

exercise_time_data <- df %>%
  select(uid, group, condition, day, week, y = hk_appleexercisetime)

## --- inclusion (same as main analysis)
keep_uid_baseline_ex <- exercise_time_data %>%
  filter(day <= 0) %>%
  group_by(uid) %>%
  summarise(n_base = sum(!is.na(y)), .groups = "drop") %>%
  filter(n_base >= 30) %>%
  pull(uid)

exercise_time_data <- exercise_time_data %>% filter(uid %in% keep_uid_baseline_ex)

keep_uid_study_ex <- exercise_time_data %>%
  filter(day >= 1, day <= 28) %>%
  group_by(uid) %>%
  summarise(n_missing_study = sum(is.na(y)), .groups = "drop") %>%
  filter(n_missing_study < 3) %>%
  pull(uid)

exercise_time_data <- exercise_time_data %>% filter(uid %in% keep_uid_study_ex)

exercise_time_data <- exercise_time_data %>%
  mutate(
    week_num = as.integer(as.character(week)), 
    period   = if_else(week_num <= 0, "baseline", "study")
  )

weekly_minutes <- exercise_time_data %>%
  group_by(uid, condition, group, period, week_num) %>%
  summarise(
    weekly_minutes = 7 * mean(y, na.rm = TRUE), # corrects for weeks with < 7 days (missing data)
    .groups = "drop"
  )

## --- within person/period: average of weekly minutes across weeks ---
person_period <- weekly_minutes %>%
  group_by(uid, condition, group, period) %>%
  summarise(
    avg_weekly_minutes = mean(weekly_minutes, na.rm = TRUE),
    .groups = "drop"
  ) %>%
  mutate(meets_150 = avg_weekly_minutes >= 150)

## --- overall percentages by period (pre vs during) ---
overall <- person_period %>%
  group_by(period) %>%
  summarise(
    n_participants = n(),
    n_meeting      = sum(meets_150, na.rm = TRUE),
    pct_meeting    = round(100 * n_meeting / n_participants, 1),
    .groups = "drop"
  ) %>%
  arrange(match(period, c("baseline", "study")))

## --- percentages by treatment/control and period ---
by_condition <- person_period %>%
  group_by(period, group) %>%
  summarise(
    n_participants = n(),
    n_meeting      = sum(meets_150, na.rm = TRUE),
    pct_meeting    = round(100 * n_meeting / n_participants, 1),
    .groups = "drop"
  ) %>%
  arrange(match(period, c("baseline", "study")), group)

cat("\n=== 150 min/week adherence (hk_appleexercisetime) ===\n")
cat("Overall (pre vs during):\n")
print(overall)
cat("\nBy condition:\n")
print(by_condition)
