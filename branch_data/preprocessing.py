"""
branch_data/preprocessing.py
Run: python branch_data/preprocessing.py
Fills missing dates, engineers 32 features, saves master CSV.
"""
import pandas as pd, numpy as np, sys, os, json
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.config import PATHS, INDIA_HOLIDAYS, ATM_LIST, ZONE_MAP, ATM_ENC, ZONE_ENC
from sklearn.preprocessing import LabelEncoder

NUMERIC = ['No_Of_Withdrawals','no_of_XYZ_card_withdrawals',
           'no_of_other_card_withdrawals','total_amount_withdrawn',
           'amount_withdrawn_XYZ_card','amount_withdrawn_other_card']

def run():
    print("="*55)
    print("BRANCH DATA — Preprocessing")
    print("="*55)

    # 1. Load raw
    df_raw = pd.read_csv(PATHS["raw_data"])
    df_raw['transaction_date'] = pd.to_datetime(df_raw['transaction_date'], format='%d/%m/%Y', errors='coerce')
    df_raw = df_raw.dropna(subset=['transaction_date'])
    print(f"  Raw rows     : {len(df_raw)}")

    # 2. Fill missing dates per ATM
    frames = []
    total_filled = 0
    for atm in ATM_LIST:
        sub  = df_raw[df_raw['atm_name']==atm].copy().set_index('transaction_date')
        full = pd.date_range(sub.index.min(), sub.index.max(), freq='D')
        filled = len(full) - len(sub)
        total_filled += filled
        sub  = sub.reindex(full)
        sub[NUMERIC] = sub[NUMERIC].ffill().bfill()
        sub['atm_name']    = atm
        sub['weekday']     = sub.index.strftime('%A').str.lower()
        sub['working_day'] = ['H' if i>=5 else 'W' for i in sub.index.dayofweek]
        sub.index.name = 'transaction_date'
        frames.append(sub.reset_index())
    df = pd.concat(frames, ignore_index=True)
    df = df.sort_values(['atm_name','transaction_date']).reset_index(drop=True)
    print(f"  After fill   : {len(df)} rows ({total_filled} dates filled)")

    # 3. Calendar features
    df['year']         = df['transaction_date'].dt.year
    df['month']        = df['transaction_date'].dt.month
    df['day']          = df['transaction_date'].dt.day
    df['day_of_week']  = df['transaction_date'].dt.dayofweek
    df['is_weekend']   = (df['day_of_week']>=5).astype(int)
    df['is_month_end'] = df['transaction_date'].dt.is_month_end.astype(int)
    df['is_month_start']= df['transaction_date'].dt.is_month_start.astype(int)
    df['dow_sin']      = np.sin(2*np.pi*df['day_of_week']/7)
    df['dow_cos']      = np.cos(2*np.pi*df['day_of_week']/7)
    df['month_sin']    = np.sin(2*np.pi*df['month']/12)
    df['month_cos']    = np.cos(2*np.pi*df['month']/12)

    # 4. Holiday features
    df['is_holiday']   = df['transaction_date'].isin(INDIA_HOLIDAYS).astype(int)
    df['pre_holiday']  = df['transaction_date'].apply(lambda d: int((d+pd.Timedelta(days=1)) in INDIA_HOLIDAYS))
    df['post_holiday'] = df['transaction_date'].apply(lambda d: int((d-pd.Timedelta(days=1)) in INDIA_HOLIDAYS))
    df['is_salary_day']= ((df['day']==1)|(df['is_month_end']==1)).astype(int)

    # 5. ATM-specific features
    df['atm_zone']            = df['atm_name'].map(ZONE_MAP).fillna('unknown')
    df['atm_global_mean']     = df.groupby('atm_name')['total_amount_withdrawn'].transform('mean')
    df['xyz_ratio']           = df['amount_withdrawn_XYZ_card']/(df['total_amount_withdrawn']+1)
    df['avg_withdrawal_size'] = df['total_amount_withdrawn']/(df['No_Of_Withdrawals']+1)

    # 6. Lag & rolling features
    for atm in ATM_LIST:
        mask = df['atm_name']==atm
        idx  = df.loc[mask].index
        s    = pd.Series(df.loc[mask,'total_amount_withdrawn'].values, index=idx)
        sn   = pd.Series(df.loc[mask,'No_Of_Withdrawals'].values, index=idx)
        df.loc[mask,'lag_1d']          = s.shift(1).values
        df.loc[mask,'lag_7d']          = s.shift(7).values
        df.loc[mask,'lag_14d']         = s.shift(14).values
        df.loc[mask,'lag_28d']         = s.shift(28).values
        df.loc[mask,'roll_mean_7d']    = s.shift(1).rolling(7).mean().values
        df.loc[mask,'roll_mean_14d']   = s.shift(1).rolling(14).mean().values
        df.loc[mask,'roll_mean_30d']   = s.shift(1).rolling(30).mean().values
        df.loc[mask,'roll_std_7d']     = s.shift(1).rolling(7).std().values
        df.loc[mask,'roll_std_30d']    = s.shift(1).rolling(30).std().values
        df.loc[mask,'lag_same_weekday']= s.shift(7).values
        df.loc[mask,'txn_lag_1d']      = sn.shift(1).values
        df.loc[mask,'txn_lag_7d']      = sn.shift(7).values
        df.loc[mask,'txn_roll_7d']     = sn.shift(1).rolling(7).mean().values

    # 7. Anomaly flag
    m = df.groupby('atm_name')['total_amount_withdrawn'].transform('mean')
    s = df.groupby('atm_name')['total_amount_withdrawn'].transform('std')
    df['anomaly_flag'] = ((df['total_amount_withdrawn']>m+3*s)|(df['total_amount_withdrawn']<m-3*s)).astype(int)

    # 8. Encode
    df['atm_encoded']  = df['atm_name'].map(ATM_ENC).fillna(0).astype(int)
    df['zone_encoded'] = df['atm_zone'].map(ZONE_ENC).fillna(4).astype(int)

    # 9. Save
    os.makedirs(os.path.dirname(PATHS["processed_data"]), exist_ok=True)
    df.to_csv(PATHS["processed_data"], index=False)
    print(f"  Saved        : {PATHS['processed_data']}")
    print(f"  Shape        : {df.shape}")
    print(f"  Anomalies    : {df['anomaly_flag'].sum()}")
    print("="*55)
    return df

if __name__ == "__main__":
    run()
