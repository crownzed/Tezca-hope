import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from './api';
import {
  loadDailyProgressLocal,
  loadDashboardExercises,
  loadFoodLog,
  saveDailyProgressLocal,
  saveDashboardExercises,
  saveFoodLog,
  type DashboardExercise,
  type FoodLogItem,
} from './dashboardStorage';
import { syncTrainingProgressToServer } from './syncTrainingProgress';
import type { TrainingPlanResponse, TrainingPlanStatus } from './trainingPlan';
import {
  normalizeDailyProgressFromApi,
  type DailyProgressMap,
} from './trainingDayProgress';

const STORAGE = {
  exercises: 'tezca_dashboard_exercises_v1',
  daily: 'tezca_dashboard_daily_v1',
  food: 'tezca_dashboard_food_v1',
} as const;

export type DisciplineScopeKind = 'guest' | 'account';

export type DisciplineLocalBundle = {
  exercises: DashboardExercise[];
  dailyProgress: DailyProgressMap;
  foodLog: FoodLogItem[];
};

function storageKey(base: string, scopeId: string | null): string {
  return scopeId ? `${base}_${scopeId}` : `${base}_guest`;
}

function hasStored(base: string, scopeId: string | null): boolean {
  return localStorage.getItem(storageKey(base, scopeId)) != null;
}

/**
 * Khi đăng nhập: chuyển dữ liệu guest vào tài khoản nếu account chưa có bản lưu.
 * Trả về true nếu có thay đổi trên localStorage.
 */
export function adoptGuestDisciplineDataIntoAccount(accountScopeId: string): boolean {
  const guestScopeId: string | null = null;
  let adopted = false;

  if (
    !hasStored(STORAGE.exercises, accountScopeId) &&
    hasStored(STORAGE.exercises, guestScopeId)
  ) {
    saveDashboardExercises(accountScopeId, loadDashboardExercises(guestScopeId));
    adopted = true;
  }

  const guestDaily = loadDailyProgressLocal(guestScopeId);
  if (Object.keys(guestDaily).length > 0) {
    const accountDaily = loadDailyProgressLocal(accountScopeId);
    const merged = { ...guestDaily, ...accountDaily };
    if (JSON.stringify(merged) !== JSON.stringify(accountDaily)) {
      saveDailyProgressLocal(accountScopeId, merged);
      adopted = true;
    }
  }

  if (!hasStored(STORAGE.food, accountScopeId) && hasStored(STORAGE.food, guestScopeId)) {
    saveFoodLog(accountScopeId, loadFoodLog(guestScopeId));
    adopted = true;
  }

  return adopted;
}

export function loadDisciplineLocalBundle(scopeId: string | null): DisciplineLocalBundle {
  if (scopeId) adoptGuestDisciplineDataIntoAccount(scopeId);
  return {
    exercises: loadDashboardExercises(scopeId),
    dailyProgress: loadDailyProgressLocal(scopeId),
    foodLog: loadFoodLog(scopeId),
  };
}

export function resolveDisciplineScope(
  userId: string | null | undefined,
  token: string | null | undefined,
): { scopeId: string | null; kind: DisciplineScopeKind; canSync: boolean } {
  const scopeId = userId ?? null;
  const kind: DisciplineScopeKind = scopeId ? 'account' : 'guest';
  const canSync = Boolean(token && scopeId);
  return { scopeId, kind, canSync };
}

export function saveDisciplineExercises(scopeId: string | null, exercises: DashboardExercise[]) {
  saveDashboardExercises(scopeId, exercises);
}

export type UseDisciplineDataScopeInput = {
  userId: string | null;
  token: string | null;
};

export function useDisciplineDataScope({ userId, token }: UseDisciplineDataScopeInput) {
  const scopeId = userId;
  const { canSync, kind } = resolveDisciplineScope(scopeId, token);

  const [baseExercises, setBaseExercises] = useState<DashboardExercise[]>(() => {
    const initial = loadDisciplineLocalBundle(scopeId);
    return initial.exercises;
  });
  const [dailyProgress, setDailyProgress] = useState<DailyProgressMap>(() => {
    const initial = loadDisciplineLocalBundle(scopeId);
    return initial.dailyProgress;
  });
  const [foodLog, setFoodLog] = useState<FoodLogItem[]>(() => {
    const initial = loadDisciplineLocalBundle(scopeId);
    return initial.foodLog;
  });
  const [trainingStatus, setTrainingStatus] = useState<TrainingPlanStatus | null>(null);
  const [expertTrainingNote, setExpertTrainingNote] = useState('');
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'error'>('idle');

  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const bundle = loadDisciplineLocalBundle(scopeId);
    setBaseExercises(bundle.exercises);
    setDailyProgress(bundle.dailyProgress);
    setFoodLog(bundle.foodLog);
    setTrainingStatus(null);
    setExpertTrainingNote('');
    setSyncState('idle');
  }, [scopeId]);

  useEffect(() => {
    if (!canSync || !token) return;
    let cancelled = false;
    apiFetch<TrainingPlanResponse>('/api/me/training-plan', { token })
      .then((r) => {
        if (cancelled || !r.plan?.exercises?.length) return;
        setTrainingStatus(r.plan.status);
        setExpertTrainingNote(r.plan.expertNote || '');
        setBaseExercises(r.plan.exercises);
        const serverDaily = normalizeDailyProgressFromApi(r.plan.dailyProgress);
        setDailyProgress((prev) => {
          const merged = { ...prev, ...serverDaily };
          saveDailyProgressLocal(scopeId, merged);
          return merged;
        });
        saveDashboardExercises(scopeId, r.plan.exercises);
      })
      .catch(() => {
        /* giữ bản local */
      });
    return () => {
      cancelled = true;
    };
  }, [canSync, token, scopeId]);

  useEffect(() => {
    saveDashboardExercises(scopeId, baseExercises);
  }, [baseExercises, scopeId]);

  useEffect(() => {
    saveDailyProgressLocal(scopeId, dailyProgress);
  }, [dailyProgress, scopeId]);

  useEffect(() => {
    saveFoodLog(scopeId, foodLog);
  }, [foodLog, scopeId]);

  const pushProgress = useCallback(
    (dateIso: string, dayExercises: DashboardExercise[], immediate = false) => {
      if (!canSync || !token) return;
      const run = () => {
        setSyncState('syncing');
        void syncTrainingProgressToServer(token, dateIso, dayExercises, baseExercises).then((ok) => {
          setSyncState(ok ? 'idle' : 'error');
        });
      };
      if (immediate) {
        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        run();
        return;
      }
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(run, 500);
    },
    [canSync, token, baseExercises],
  );

  return {
    scopeId,
    kind,
    canSync,
    baseExercises,
    setBaseExercises,
    dailyProgress,
    setDailyProgress,
    foodLog,
    setFoodLog,
    trainingStatus,
    expertTrainingNote,
    syncState,
    pushProgress,
  };
}
