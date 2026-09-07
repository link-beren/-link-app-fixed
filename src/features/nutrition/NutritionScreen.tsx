import { Link, Route, Routes } from 'react-router-dom';
import { Card } from '@/components/Card';
import { WeightScreen } from '@/features/nutrition/WeightScreen';
import { WeightGoalScreen } from '@/features/nutrition/WeightGoalScreen';
import { WorkoutsScreen } from '@/features/nutrition/WorkoutsScreen';
import { FoodLogScreen } from '@/features/nutrition/FoodLogScreen';

function NutritionHub() {
  return (
    <div className="safe-x flex flex-col gap-4 p-4 pb-8">
      <h1 className="text-2xl font-bold">תזונה</h1>
      <Link to="/nutrition/weight">
        <Card className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">יומן שקילות</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">גרף משקל, ממוצע נע וקצב שינוי שבועי.</p>
        </Card>
      </Link>
      <Link to="/nutrition/goal">
        <Card className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">יעד משקל</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">הגדרת גירעון קלורי, BMR ואזהרות בטיחות.</p>
        </Card>
      </Link>
      <Link to="/nutrition/workouts">
        <Card className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">אימונים</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">לוח שבועי קבוע ורישום אימונים בפועל.</p>
        </Card>
      </Link>
      <Link to="/nutrition/food">
        <Card className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">יומן אוכל</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">הזנת אוכל בטקסט חופשי, סיכום יומי ושבועי ותחזית.</p>
        </Card>
      </Link>
    </div>
  );
}

export function NutritionScreen() {
  return (
    <Routes>
      <Route index element={<NutritionHub />} />
      <Route path="weight" element={<WeightScreen />} />
      <Route path="goal" element={<WeightGoalScreen />} />
      <Route path="workouts" element={<WorkoutsScreen />} />
      <Route path="food" element={<FoodLogScreen />} />
    </Routes>
  );
}
