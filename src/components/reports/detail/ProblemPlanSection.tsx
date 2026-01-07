'use client';

import { AlertCircle, CheckSquare } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProblemPlanSectionProps {
  problem: string | null;
  plan: string | null;
}

/**
 * Problem/Planセクションコンポーネント
 *
 * 課題・相談事項と明日やることを表示
 */
export function ProblemPlanSection({ problem, plan }: ProblemPlanSectionProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Problem（課題・相談） */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Problem（課題・相談）
          </CardTitle>
        </CardHeader>
        <CardContent>
          {problem ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{problem}</p>
          ) : (
            <p className="text-sm text-muted-foreground">特になし</p>
          )}
        </CardContent>
      </Card>

      {/* Plan（明日やること） */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckSquare className="h-5 w-5 text-blue-500" />
            Plan（明日やること）
          </CardTitle>
        </CardHeader>
        <CardContent>
          {plan ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{plan}</p>
          ) : (
            <p className="text-sm text-muted-foreground">特になし</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
