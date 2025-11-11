import React, { useMemo, useState, useEffect } from 'react';
import {
  Search,
  Compass,
  TrendingUp,
  Calendar,
  Layers,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import { trackThesys } from './thesys';
import {
  ExplorationSuggestion,
  ExplorationType,
  ViztaChatResponse,
} from './types';

type ClassValue = string | false | null | undefined;
const cn = (...classes: ClassValue[]) => classes.filter(Boolean).join(' ');

const iconMap: Record<string, React.ComponentType<any>> = {
  Search,
  Compass,
  TrendingUp,
  Calendar,
  Layers,
  HelpCircle,
};

const typeFallbackIcon: Record<ExplorationType, React.ComponentType<any>> = {
  deep_dive: Search,
  topic: Compass,
  data_money: TrendingUp,
  data_timeline: Calendar,
  source_compare: Layers,
  questions: HelpCircle,
};

const colorToClasses = (color?: string, variant: 'soft' | 'solid' | 'outline' = 'soft') => {
  switch (variant) {
    case 'solid':
      return {
        blue: 'bg-blue-600 text-white border-blue-600',
        indigo: 'bg-indigo-600 text-white border-indigo-600',
        emerald: 'bg-emerald-600 text-white border-emerald-600',
        amber: 'bg-amber-600 text-white border-amber-600',
        purple: 'bg-purple-600 text-white border-purple-600',
        pink: 'bg-pink-600 text-white border-pink-600',
        gray: 'bg-gray-600 text-white border-gray-600',
      }[color || 'gray'];
    case 'outline':
      return {
        blue: 'border-blue-300 text-blue-700 hover:bg-blue-50',
        indigo: 'border-indigo-300 text-indigo-700 hover:bg-indigo-50',
        emerald: 'border-emerald-300 text-emerald-700 hover:bg-emerald-50',
        amber: 'border-amber-300 text-amber-700 hover:bg-amber-50',
        purple: 'border-purple-300 text-purple-700 hover:bg-purple-50',
        pink: 'border-pink-300 text-pink-700 hover:bg-pink-50',
        gray: 'border-gray-300 text-gray-700 hover:bg-gray-50',
      }[color || 'gray'];
    case 'soft':
    default:
      return {
        blue: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
        amber: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
        purple: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
        pink: 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100',
        gray: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
      }[color || 'gray'];
  }
};

export interface ExplorationChipsProps {
  conversationId: string;
  suggestions: ExplorationSuggestion[];
  depth?: number;
  depthLimit?: number;
  className?: string;
  onResult?: (data: ViztaChatResponse<any>) => void;
  onDepthChange?: (newDepth: number) => void;
  maxVisible?: number;
  endpoint?: string; // default: '/api/vizta-chat/query'
}

export const ExplorationChips: React.FC<ExplorationChipsProps> = ({
  conversationId,
  suggestions,
  depth = 0,
  depthLimit = 2,
  className,
  onResult,
  onDepthChange,
  maxVisible = 8,
  endpoint = '/api/vizta-chat/query',
}) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [visited, setVisited] = useState<Record<string, boolean>>({});

  const disabledByDepth = depth >= depthLimit;
  const visible = useMemo(() => {
    const withPriority = [...(suggestions || [])].sort((a, b) => (b.ui?.priority || 0) - (a.ui?.priority || 0));
    return withPriority.slice(0, maxVisible);
  }, [suggestions, maxVisible]);

  useEffect(() => {
    trackThesys('exploration_suggestions_shown', {
      conversationId,
      count: suggestions?.length || 0,
      visible: visible.length,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = async (s: ExplorationSuggestion, idx: number) => {
    if (loadingId || disabledByDepth || visited[s.id]) return;
    setLoadingId(s.id);
    setVisited((v) => ({ ...v, [s.id]: true }));

    trackThesys('exploration_suggestion_clicked', {
      suggestionId: s.id,
      type: s.type,
      idx,
      conversationId,
      traceId: s.analytics?.traceId,
      actionId: s.analytics?.actionId,
    });

    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: s.prompt,
          conversationId,
          mode: 'chat',
        }),
      });

      const data = (await resp.json()) as ViztaChatResponse<any>;
      if (!resp.ok || !data?.success) {
        throw new Error(data?.error || 'exploration_failed');
      }

      trackThesys('exploration_result_received', {
        suggestionId: s.id,
        conversationId,
        hasNewSuggestions: Array.isArray(data.explorationSuggestions) && data.explorationSuggestions.length > 0,
      });

      onResult?.(data);
      onDepthChange?.(depth + 1);
    } catch (error: any) {
      trackThesys('exploration_result_failed', {
        suggestionId: s.id,
        conversationId,
        error: error?.message || 'unknown_error',
      });
      setVisited((v) => ({ ...v, [s.id]: false }));
    } finally {
      setLoadingId(null);
    }
  };

  if (!Array.isArray(suggestions) || suggestions.length === 0) return null;

  const layoutClass = visible.length > 3 ? 'grid grid-cols-2 md:grid-cols-3 gap-2' : 'flex flex-wrap gap-2';

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-gray-700">Explorar</div>
        <div className="text-[10px] text-gray-500">Profundidad: {depth}/{depthLimit}</div>
      </div>

      <div className={layoutClass}>
        {visible.map((s, idx) => {
          const Icon = s.ui?.icon && iconMap[s.ui.icon] ? iconMap[s.ui.icon] : typeFallbackIcon[s.type] || Search;
          const variant = s.ui?.variant || 'soft';
          const colorCls = colorToClasses(s.ui?.color, variant);
          const disabled = disabledByDepth || visited[s.id];
          const isLoading = loadingId === s.id;

          return (
            <button
              key={s.id}
              type="button"
              onClick={() => handleClick(s, idx)}
              disabled={disabled || !!loadingId}
              className={cn(
                'text-xs px-3 py-2 rounded-lg border transition-colors flex items-center gap-1.5',
                colorCls,
                (disabled || !!loadingId) && 'opacity-60 cursor-not-allowed',
              )}
              title={s.explanation || s.title}
              aria-busy={isLoading}
              aria-pressed={visited[s.id] || false}
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Icon className="h-3.5 w-3.5" />
              )}
              <span className="truncate">{s.title}</span>
            </button>
          );
        })}
      </div>

      {disabledByDepth && (
        <div className="text-[10px] text-gray-500">Límite de exploración alcanzado para este hilo.</div>
      )}
    </div>
  );
};

export default ExplorationChips;

