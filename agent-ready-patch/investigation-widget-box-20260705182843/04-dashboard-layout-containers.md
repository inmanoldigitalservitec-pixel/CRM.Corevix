## 04-dashboard-layout-containers
```
src/components/dashboard-v2/dashboard-kpi-card.tsx:28:    <article className="flex h-[74px] min-w-0 items-center gap-2.5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white px-3 py-2 shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
src/components/dashboard-v2/dashboard-kpi-card.tsx:31:          "grid h-9 w-9 shrink-0 place-items-center rounded-xl border",
src/components/dashboard-v2/dashboard-kpi-card.tsx:35:        <Icon className="h-3.5 w-3.5" />
src/components/dashboard-v2/dashboard-kpi-card.tsx:38:      <div className="min-w-0">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:19:import { DashboardCard, DashboardTextButton } from "./dashboard-card";
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:20:import { DashboardKpiCard } from "./dashboard-kpi-card";
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:254:      className="mt-1 grid h-7 w-full place-items-center rounded-lg text-[11px] font-medium text-blue-600 hover:bg-blue-50"
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:275:    <div className="grid min-h-0 gap-2.5 p-3 xl:h-[calc(100svh-64px)] xl:grid-rows-[74px_minmax(0,1fr)_minmax(0,0.68fr)] xl:overflow-hidden xl:p-3">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:276:      <section className="grid min-h-0 gap-2.5 md:grid-cols-2 xl:grid-cols-6">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:280:      </section>
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:282:      <section className="grid min-h-0 gap-2.5 xl:grid-cols-[minmax(0,1.78fr)_minmax(292px,.68fr)]">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:283:        <DashboardCard
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:286:          className="xl:min-h-0"
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:288:          <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:292:            <div className="min-h-0 overflow-hidden">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:293:              <div className="grid grid-cols-[minmax(210px,1.3fr)_minmax(116px,.68fr)_minmax(104px,.58fr)_74px_116px] border-b border-slate-200 bg-slate-50 px-4 py-1.5 text-[10.5px] font-medium text-slate-500">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:307:                    className="grid grid-cols-[minmax(210px,1.3fr)_minmax(116px,.68fr)_minmax(104px,.58fr)_74px_116px] items-center gap-2 border-b border-slate-200 px-4 py-1.5 text-[11.5px]"
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:309:                    <div className="flex min-w-0 items-center gap-3">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:310:                      <span className="h-3 w-3 shrink-0 rounded border border-slate-300" />
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:312:                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border ${softIcon(item.tone)}`}
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:314:                        <Icon className="h-3 w-3" />
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:332:                      className={`w-fit rounded-lg px-2 py-0.5 text-[10.5px] font-medium ${priorityClass(
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:344:                      className="h-7 rounded-lg border border-blue-200 px-2.5 text-[11px] font-medium text-slate-700 hover:bg-blue-50"
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:357:        </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:359:        <div className="min-h-0">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:360:          <DashboardCard
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:363:            className="h-full"
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:365:            <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] px-4 py-2">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:366:              <div className="min-h-0 overflow-hidden">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:374:                    className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-2 border-t border-slate-200 py-1.5"
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:377:                      className={`w-fit rounded-lg px-2 py-0.5 text-[10.5px] font-semibold ${
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:392:                    <span className="min-w-0">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:393:                      <span className="flex min-w-0 items-center gap-1.5">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:395:                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${toneDot(String(tone))}`}
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:413:          </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:415:      </section>
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:417:      <section className="grid min-h-0 gap-2.5 xl:grid-cols-[1.05fr_.95fr_1.05fr]">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:418:        <DashboardCard
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:421:          bodyClassName="h-full p-3"
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:423:          <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-2">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:424:            <div className="grid min-h-0 gap-3 overflow-hidden md:grid-cols-[1.15fr_.85fr]">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:425:              <div className="min-h-0 overflow-hidden">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:439:                        className="grid grid-cols-[72px_1fr_20px_52px] items-center gap-2 text-[10.8px]"
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:442:                        <span className="h-4 overflow-hidden rounded bg-slate-100">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:443:                          <i className={`block h-full ${color}`} style={{ width: `${percent}%` }} />
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:452:              <div className="min-h-0 overflow-hidden border-t border-slate-200 pt-2 md:border-l md:border-t-0 md:pl-3 md:pt-0">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:468:                        className="grid grid-cols-[62px_60px_1fr_28px] items-center gap-2 text-[10.5px]"
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:472:                        <span className="h-1.5 overflow-hidden rounded-full bg-slate-200">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:473:                          <i className={`block h-full ${color}`} style={{ width: percent }} />
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:488:        </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:490:        <DashboardCard
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:493:          bodyClassName="h-full p-3"
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:495:          <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto]">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:496:            <div className="min-h-0 space-y-1.5 overflow-hidden">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:502:                    className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-2 border-b border-slate-200 py-1 last:border-0"
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:505:                      className={`grid h-6 w-6 place-items-center rounded-lg text-[9.5px] font-semibold text-white ${
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:515:                    <span className="min-w-0">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:538:        </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:540:        <DashboardCard
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:543:          bodyClassName="h-full p-3"
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:545:          <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto]">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:546:            <div className="min-h-0 space-y-1 overflow-hidden">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:548:                <div className="grid h-full place-items-center rounded-xl bg-slate-50 px-4 text-center">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:569:                      className="grid w-full grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2 border-b border-slate-200 py-1.5 text-left last:border-0 hover:bg-slate-50"
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:572:                        className={`grid h-8 w-8 place-items-center rounded-full border ${
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:584:                        <ChannelIcon className="h-3.5 w-3.5" />
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:587:                      <span className="min-w-0">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:588:                        <span className="flex min-w-0 items-center gap-1.5">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:617:              className="mt-1 grid h-7 w-full place-items-center rounded-lg text-[11px] font-medium text-blue-600 hover:bg-blue-50"
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:622:        </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:623:      </section>
src/components/dashboard-v2/dashboard-v2.tsx:24:import { DashboardCard, DashboardTextButton } from "./dashboard-card";
src/components/dashboard-v2/dashboard-v2.tsx:25:import { DashboardKpiCard } from "./dashboard-kpi-card";
src/components/dashboard-v2/dashboard-v2.tsx:294:  ["Sin datos", "Conecta datos para ver este widget.", "Pendiente", "neutral", "/dashboard"],
src/components/dashboard-v2/dashboard-v2.tsx:319:    <DashboardCard bodyClassName="p-3">
src/components/dashboard-v2/dashboard-v2.tsx:320:      <div className="flex h-full min-h-0 items-center gap-3">
src/components/dashboard-v2/dashboard-v2.tsx:322:          className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border ${softIcon(tone)}`}
src/components/dashboard-v2/dashboard-v2.tsx:324:          <Icon className="h-4 w-4" />
src/components/dashboard-v2/dashboard-v2.tsx:327:        <span className="min-w-0 flex-1">
src/components/dashboard-v2/dashboard-v2.tsx:328:          <span className="flex min-w-0 items-center justify-between gap-2">
src/components/dashboard-v2/dashboard-v2.tsx:350:    </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx:375:    <section
src/components/dashboard-v2/dashboard-v2.tsx:378:          ? "grid min-h-0 gap-2.5 md:grid-cols-2 xl:grid-cols-3"
src/components/dashboard-v2/dashboard-v2.tsx:379:          : "grid min-h-0 gap-2.5 md:grid-cols-2 xl:grid-cols-6"
src/components/dashboard-v2/dashboard-v2.tsx:385:    </section>
src/components/dashboard-v2/dashboard-v2.tsx:398:      className="mt-1 grid h-7 w-full place-items-center rounded-lg text-[11px] font-medium text-blue-600 hover:bg-blue-50"
src/components/dashboard-v2/dashboard-v2.tsx:464:    <DashboardCard
src/components/dashboard-v2/dashboard-v2.tsx:467:      bodyClassName="h-full p-3"
src/components/dashboard-v2/dashboard-v2.tsx:469:      <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]">
src/components/dashboard-v2/dashboard-v2.tsx:470:        <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
src/components/dashboard-v2/dashboard-v2.tsx:471:          <span className="min-w-0">
src/components/dashboard-v2/dashboard-v2.tsx:481:          <span className="grid grid-cols-3 gap-1 text-center">
src/components/dashboard-v2/dashboard-v2.tsx:503:        <div className="min-h-0 space-y-1.5 overflow-hidden">
src/components/dashboard-v2/dashboard-v2.tsx:505:            <div className="grid h-full place-items-center rounded-xl bg-slate-50 px-4 text-center">
src/components/dashboard-v2/dashboard-v2.tsx:516:                className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-transparent px-2 py-1.5 text-left hover:border-slate-200 hover:bg-white"
src/components/dashboard-v2/dashboard-v2.tsx:518:                <span className="flex min-w-0 items-center gap-2">
src/components/dashboard-v2/dashboard-v2.tsx:519:                  <i className={`h-2 w-2 shrink-0 rounded-full ${toneDot(itemTone)}`} />
src/components/dashboard-v2/dashboard-v2.tsx:520:                  <span className="min-w-0">
src/components/dashboard-v2/dashboard-v2.tsx:530:                  className={`max-w-[96px] truncate rounded-full px-2 py-0.5 text-[10px] font-semibold ${toneBadgeClass(
src/components/dashboard-v2/dashboard-v2.tsx:547:    </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx:595:    <DashboardCard
src/components/dashboard-v2/dashboard-v2.tsx:598:      bodyClassName="h-full p-3"
src/components/dashboard-v2/dashboard-v2.tsx:600:      <div className="grid h-full min-h-0 gap-2 md:grid-cols-2">
src/components/dashboard-v2/dashboard-v2.tsx:602:          <div key={label} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
src/components/dashboard-v2/dashboard-v2.tsx:617:    </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx:640:    <div className="min-w-0">
src/components/dashboard-v2/dashboard-v2.tsx:641:      <div className="mb-3 flex min-w-0 items-center gap-2">
src/components/dashboard-v2/dashboard-v2.tsx:642:        <Icon className="h-4 w-4 shrink-0 text-slate-500" />
src/components/dashboard-v2/dashboard-v2.tsx:654:            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
src/components/dashboard-v2/dashboard-v2.tsx:656:                className={`block h-full rounded-full ${progressColor(tone)}`}
src/components/dashboard-v2/dashboard-v2.tsx:696:    <DashboardCard
src/components/dashboard-v2/dashboard-v2.tsx:699:      bodyClassName="h-full p-4"
src/components/dashboard-v2/dashboard-v2.tsx:701:      <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-4">
src/components/dashboard-v2/dashboard-v2.tsx:702:        <div className="grid min-h-0 gap-5 overflow-hidden md:grid-cols-3">
src/components/dashboard-v2/dashboard-v2.tsx:720:        <div className="grid gap-2 border-t border-slate-200 pt-3 sm:grid-cols-3">
src/components/dashboard-v2/dashboard-v2.tsx:728:              className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left hover:bg-slate-50"
src/components/dashboard-v2/dashboard-v2.tsx:740:    </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx:782:    <DashboardCard bodyClassName="h-full p-0">
src/components/dashboard-v2/dashboard-v2.tsx:783:      <div className="grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)]">
src/components/dashboard-v2/dashboard-v2.tsx:784:        <div className="flex min-w-0 items-center gap-1 overflow-x-auto border-b border-slate-200 px-3 py-2">
src/components/dashboard-v2/dashboard-v2.tsx:790:              className={`flex h-8 shrink-0 items-center gap-1.5 border-b-2 px-2 text-[12px] font-semibold ${
src/components/dashboard-v2/dashboard-v2.tsx:796:              <Icon className="h-3.5 w-3.5" />
src/components/dashboard-v2/dashboard-v2.tsx:809:        <div className="min-h-0 overflow-hidden px-4 pb-3">
src/components/dashboard-v2/dashboard-v2.tsx:811:            <div className="grid h-full place-items-center rounded-xl bg-slate-50 text-center">
src/components/dashboard-v2/dashboard-v2.tsx:817:            <div className="overflow-hidden rounded-lg border border-slate-200">
src/components/dashboard-v2/dashboard-v2.tsx:818:              <div className="grid grid-cols-[36px_minmax(0,1fr)_92px_84px] bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500">
src/components/dashboard-v2/dashboard-v2.tsx:831:                  className="grid w-full grid-cols-[36px_minmax(0,1fr)_92px_84px] items-center gap-2 border-t border-slate-200 px-3 py-2 text-left hover:bg-slate-50"
src/components/dashboard-v2/dashboard-v2.tsx:834:                  <span className="min-w-0">
src/components/dashboard-v2/dashboard-v2.tsx:843:                    className={`w-fit max-w-[86px] truncate rounded-md px-2 py-0.5 text-[10.5px] font-semibold ${toneBadgeClass(
src/components/dashboard-v2/dashboard-v2.tsx:858:    </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx:885:    <DashboardCard
src/components/dashboard-v2/dashboard-v2.tsx:888:      bodyClassName="h-full p-4"
src/components/dashboard-v2/dashboard-v2.tsx:890:      <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
src/components/dashboard-v2/dashboard-v2.tsx:891:        <section className="min-h-0 overflow-hidden">
src/components/dashboard-v2/dashboard-v2.tsx:893:            <AlertTriangle className="h-3.5 w-3.5" />
src/components/dashboard-v2/dashboard-v2.tsx:909:                  className="grid w-full grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-slate-50"
src/components/dashboard-v2/dashboard-v2.tsx:911:                  <span className="h-3.5 w-3.5 rounded border border-slate-300" />
src/components/dashboard-v2/dashboard-v2.tsx:912:                  <span className="min-w-0">
src/components/dashboard-v2/dashboard-v2.tsx:920:                  <span className={`h-2 w-2 rounded-full ${toneDot(tone)}`} />
src/components/dashboard-v2/dashboard-v2.tsx:925:        </section>
src/components/dashboard-v2/dashboard-v2.tsx:927:        <section className="min-h-0 overflow-hidden">
src/components/dashboard-v2/dashboard-v2.tsx:929:            <CheckCircle2 className="h-3.5 w-3.5" />
src/components/dashboard-v2/dashboard-v2.tsx:945:                  className="grid w-full grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-slate-50"
src/components/dashboard-v2/dashboard-v2.tsx:947:                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
src/components/dashboard-v2/dashboard-v2.tsx:948:                  <span className="min-w-0">
src/components/dashboard-v2/dashboard-v2.tsx:956:                  <span className={`h-2 w-2 rounded-full ${toneDot(tone)}`} />
src/components/dashboard-v2/dashboard-v2.tsx:961:        </section>
src/components/dashboard-v2/dashboard-v2.tsx:963:    </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx:983:    <DashboardCard title={title} bodyClassName="h-full p-4">
src/components/dashboard-v2/dashboard-v2.tsx:984:      <div className="grid h-full place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center">
src/components/dashboard-v2/dashboard-v2.tsx:986:          <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500">
src/components/dashboard-v2/dashboard-v2.tsx:987:            <Icon className="h-4 w-4" />
src/components/dashboard-v2/dashboard-v2.tsx:993:    </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx:1021:    <DashboardCard
src/components/dashboard-v2/dashboard-v2.tsx:1024:      className="xl:min-h-0"
src/components/dashboard-v2/dashboard-v2.tsx:1026:      <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]">
src/components/dashboard-v2/dashboard-v2.tsx:1030:        <div className="min-h-0 overflow-hidden">
src/components/dashboard-v2/dashboard-v2.tsx:1031:          <div className="grid grid-cols-[minmax(210px,1.3fr)_minmax(116px,.68fr)_minmax(104px,.58fr)_74px_116px] border-b border-slate-200 bg-slate-50 px-4 py-1.5 text-[10.5px] font-medium text-slate-500">
src/components/dashboard-v2/dashboard-v2.tsx:1045:                className="grid grid-cols-[minmax(210px,1.3fr)_minmax(116px,.68fr)_minmax(104px,.58fr)_74px_116px] items-center gap-2 border-b border-slate-200 px-4 py-1.5 text-[11.5px]"
src/components/dashboard-v2/dashboard-v2.tsx:1047:                <div className="flex min-w-0 items-center gap-3">
src/components/dashboard-v2/dashboard-v2.tsx:1048:                  <span className="h-3 w-3 shrink-0 rounded border border-slate-300" />
src/components/dashboard-v2/dashboard-v2.tsx:1050:                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border ${softIcon(item.tone)}`}
src/components/dashboard-v2/dashboard-v2.tsx:1052:                    <Icon className="h-3 w-3" />
src/components/dashboard-v2/dashboard-v2.tsx:1070:                  className={`w-fit rounded-lg px-2 py-0.5 text-[10.5px] font-medium ${priorityClass(
src/components/dashboard-v2/dashboard-v2.tsx:1082:                  className="h-7 rounded-lg border border-blue-200 px-2.5 text-[11px] font-medium text-slate-700 hover:bg-blue-50"
src/components/dashboard-v2/dashboard-v2.tsx:1095:    </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx:1125:    <DashboardCard
src/components/dashboard-v2/dashboard-v2.tsx:1128:      className="h-full"
src/components/dashboard-v2/dashboard-v2.tsx:1130:      <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] px-4 py-2">
src/components/dashboard-v2/dashboard-v2.tsx:1131:        <div className="min-h-0 overflow-hidden">
src/components/dashboard-v2/dashboard-v2.tsx:1139:              className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-2 border-t border-slate-200 py-1.5"
src/components/dashboard-v2/dashboard-v2.tsx:1142:                className={`w-fit rounded-lg px-2 py-0.5 text-[10.5px] font-semibold ${
src/components/dashboard-v2/dashboard-v2.tsx:1157:              <span className="min-w-0">
src/components/dashboard-v2/dashboard-v2.tsx:1158:                <span className="flex min-w-0 items-center gap-1.5">
src/components/dashboard-v2/dashboard-v2.tsx:1159:                  <i className={`h-1.5 w-1.5 shrink-0 rounded-full ${toneDot(String(tone))}`} />
src/components/dashboard-v2/dashboard-v2.tsx:1176:    </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx:1210:    <DashboardCard
src/components/dashboard-v2/dashboard-v2.tsx:1213:      bodyClassName="h-full p-3"
src/components/dashboard-v2/dashboard-v2.tsx:1215:      <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-2">
src/components/dashboard-v2/dashboard-v2.tsx:1216:        <div className="grid min-h-0 gap-3 overflow-hidden md:grid-cols-[1.15fr_.85fr]">
src/components/dashboard-v2/dashboard-v2.tsx:1217:          <div className="min-h-0 overflow-hidden">
src/components/dashboard-v2/dashboard-v2.tsx:1229:                  className="grid grid-cols-[72px_1fr_20px_52px] items-center gap-2 text-[10.8px]"
src/components/dashboard-v2/dashboard-v2.tsx:1232:                  <span className="h-4 overflow-hidden rounded bg-slate-100">
src/components/dashboard-v2/dashboard-v2.tsx:1233:                    <i className={`block h-full ${color}`} style={{ width: `${percent}%` }} />
src/components/dashboard-v2/dashboard-v2.tsx:1242:          <div className="min-h-0 overflow-hidden border-t border-slate-200 pt-2 md:border-l md:border-t-0 md:pl-3 md:pt-0">
src/components/dashboard-v2/dashboard-v2.tsx:1258:                    className="grid grid-cols-[62px_60px_1fr_28px] items-center gap-2 text-[10.5px]"
src/components/dashboard-v2/dashboard-v2.tsx:1262:                    <span className="h-1.5 overflow-hidden rounded-full bg-slate-200">
src/components/dashboard-v2/dashboard-v2.tsx:1263:                      <i className={`block h-full ${color}`} style={{ width: percent }} />
src/components/dashboard-v2/dashboard-v2.tsx:1278:    </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx:1308:    <DashboardCard
src/components/dashboard-v2/dashboard-v2.tsx:1311:      bodyClassName="h-full p-3"
src/components/dashboard-v2/dashboard-v2.tsx:1313:      <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto]">
src/components/dashboard-v2/dashboard-v2.tsx:1314:        <div className="min-h-0 space-y-1.5 overflow-hidden">
src/components/dashboard-v2/dashboard-v2.tsx:1318:              className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-2 border-b border-slate-200 py-1 last:border-0"
src/components/dashboard-v2/dashboard-v2.tsx:1321:                className={`grid h-6 w-6 place-items-center rounded-lg text-[9.5px] font-semibold text-white ${
src/components/dashboard-v2/dashboard-v2.tsx:1331:              <span className="min-w-0">
src/components/dashboard-v2/dashboard-v2.tsx:1352:    </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx:1380:    <DashboardCard
src/components/dashboard-v2/dashboard-v2.tsx:1383:      bodyClassName="h-full p-3"
src/components/dashboard-v2/dashboard-v2.tsx:1385:      <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto]">
src/components/dashboard-v2/dashboard-v2.tsx:1386:        <div className="min-h-0 space-y-1 overflow-hidden">
src/components/dashboard-v2/dashboard-v2.tsx:1388:            <div className="grid h-full place-items-center rounded-xl bg-slate-50 px-4 text-center">
src/components/dashboard-v2/dashboard-v2.tsx:1411:                    className="grid w-full grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2 border-b border-slate-200 py-1.5 text-left last:border-0 hover:bg-slate-50"
src/components/dashboard-v2/dashboard-v2.tsx:1414:                      className={`grid h-8 w-8 place-items-center rounded-full border ${
src/components/dashboard-v2/dashboard-v2.tsx:1426:                      <ChannelIcon className="h-3.5 w-3.5" />
src/components/dashboard-v2/dashboard-v2.tsx:1429:                    <span className="min-w-0">
src/components/dashboard-v2/dashboard-v2.tsx:1430:                      <span className="flex min-w-0 items-center gap-1.5">
src/components/dashboard-v2/dashboard-v2.tsx:1459:          className="mt-1 grid h-7 w-full place-items-center rounded-lg text-[11px] font-medium text-blue-600 hover:bg-blue-50"
src/components/dashboard-v2/dashboard-v2.tsx:1464:    </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx:1492:    <DashboardCard
src/components/dashboard-v2/dashboard-v2.tsx:1495:      bodyClassName="h-full p-3"
src/components/dashboard-v2/dashboard-v2.tsx:1497:      <div className="min-h-0 space-y-1.5 overflow-hidden">
src/components/dashboard-v2/dashboard-v2.tsx:1501:            className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2 border-b border-slate-200 py-1.5 last:border-0"
src/components/dashboard-v2/dashboard-v2.tsx:1503:            <span className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
src/components/dashboard-v2/dashboard-v2.tsx:1504:              <Icon className="h-3.5 w-3.5" />
src/components/dashboard-v2/dashboard-v2.tsx:1506:            <span className="min-w-0">
src/components/dashboard-v2/dashboard-v2.tsx:1518:    </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx:1551:      const widgetContractResult = await fetchAgentWidgetContract();
src/components/dashboard-v2/dashboard-v2.tsx:1553:      if (widgetContractResult.payload) {
src/components/dashboard-v2/dashboard-v2.tsx:1554:        setAgentPromptPayload(widgetContractResult.payload);
src/components/dashboard-v2/dashboard-v2.tsx:1559:        schema_version: "agent_widget_contract_v1",
src/components/dashboard-v2/dashboard-v2.tsx:1572:      console.error("Failed to refresh agent widget contract", error);
src/components/dashboard-v2/dashboard-v2.tsx:1575:        schema_version: "agent_widget_contract_v1",
src/components/dashboard-v2/dashboard-v2.tsx:1748:      widgets={[
src/components/dashboard-v2/dashboard-card.tsx:4:export function DashboardCard({
src/components/dashboard-v2/dashboard-card.tsx:18:    <section
src/components/dashboard-v2/dashboard-card.tsx:20:        "flex h-full min-h-0 flex-col overflow-hidden rounded-[18px] border border-slate-200/80 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.04)]",
src/components/dashboard-v2/dashboard-card.tsx:25:        <div className="flex min-h-10 items-center justify-between gap-3 border-b border-slate-200/80 px-4">
src/components/dashboard-v2/dashboard-card.tsx:37:      <div className={cn("min-h-0 flex-1 overflow-hidden", bodyClassName)}>{children}</div>
src/components/dashboard-v2/dashboard-card.tsx:38:    </section>
src/components/demo/demo-tour.tsx:55:  if (r.width <= 0 || r.height <= 0) return null;
src/components/demo/demo-tour.tsx:204:        id: "leads-new-lead",
src/components/demo/demo-tour.tsx:211:        selector: '[data-demo="leads-new-lead-button"]',
src/components/demo/demo-tour.tsx:285:        id: "pipeline-new-deal",
src/components/demo/demo-tour.tsx:292:        selector: '[data-demo="pipeline-new-deal-button"]',
src/components/demo/demo-tour.tsx:487:        id: "proposals-row-actions",
src/components/demo/demo-tour.tsx:494:        selector: '[data-demo="proposal-row-actions"]',
src/components/demo/demo-tour.tsx:574:        selector: '[data-demo="invoice-create-project"], [data-demo="invoice-view-project"]',
src/components/demo/demo-tour.tsx:755:        selector: '[data-demo="client-360-contacts-section"]',
src/components/demo/demo-tour.tsx:928:        id: "products-workflow-steps",
src/components/demo/demo-tour.tsx:935:        selector: '[data-demo="products-workflow-steps"]',
src/components/demo/demo-tour.tsx:938:        id: "products-add-workflow-step",
src/components/demo/demo-tour.tsx:945:        selector: '[data-demo="products-add-workflow-step"]',
src/components/demo/demo-tour.tsx:1052:          new CustomEvent("crm-demo-show-public-proposal", {
src/components/demo/demo-tour.tsx:1065:        new CustomEvent("crm-demo-show-public-proposal", {
src/components/demo/demo-tour.tsx:1179:      "products-workflow-steps",
src/components/demo/demo-tour.tsx:1180:      "products-add-workflow-step",
src/components/demo/demo-tour.tsx:1368:    window.addEventListener("resize", onResize);
src/components/demo/demo-tour.tsx:1372:      window.removeEventListener("resize", onResize);
src/components/demo/demo-tour.tsx:1424:                      style={{ height: top }}
src/components/demo/demo-tour.tsx:1428:                      style={{ top, width: left, height: Math.max(0, bottom - top) }}
src/components/demo/demo-tour.tsx:1432:                      style={{ top, left: right, height: Math.max(0, bottom - top) }}
src/components/demo/demo-tour.tsx:1440:                      className="absolute rounded-[14px] ring-2 ring-[#1d62f9] shadow-[0_0_0_6px_rgba(29,98,249,0.16),0_18px_48px_rgba(29,98,249,0.22)]"
src/components/demo/demo-tour.tsx:1445:                        height: Math.max(0, bottom - top),
src/components/demo/demo-tour.tsx:1459:              className="fixed left-1/2 top-1/2 z-[1050] hidden h-[86vh] w-[430px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[24px] border bg-white shadow-[0_30px_90px_rgba(2,6,23,0.45)] xl:block"
src/components/demo/demo-tour.tsx:1461:              <div className="flex h-12 items-center justify-between border-b bg-white px-4">
src/components/demo/demo-tour.tsx:1462:                <div className="min-w-0">
src/components/demo/demo-tour.tsx:1473:                className="h-[calc(100%-48px)] w-full border-0 bg-white"
src/components/demo/demo-tour.tsx:1533:  const cardPosition = useMemo(() => {
src/components/demo/demo-tour.tsx:1572:        "fixed z-[1001] pointer-events-auto w-[min(420px,calc(100vw-40px))] rounded-[18px] border bg-white p-4 shadow-[0_28px_80px_rgba(2,6,23,0.55)]",
src/components/demo/demo-tour.tsx:1575:      style={cardPosition}
src/components/demo/demo-tour.tsx:1582:        <div className="min-w-0">
src/components/demo/demo-tour.tsx:1590:        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={onClose}>
src/components/demo/demo-tour.tsx:1600:        <Button variant="outline" className="h-9 px-3 text-xs" onClick={onPrev} disabled={!canPrev}>
src/components/demo/demo-tour.tsx:1603:        <Button className="h-9 px-3 text-xs" onClick={onNext} disabled={!canNext}>
src/components/ui/alert-dialog.tsx:37:        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
src/components/ui/pagination.tsx:11:    className={cn("mx-auto flex w-full justify-center", className)}
src/components/ui/pagination.tsx:59:    <ChevronLeft className="h-4 w-4" />
src/components/ui/pagination.tsx:73:    <ChevronRight className="h-4 w-4" />
src/components/ui/pagination.tsx:81:    className={cn("flex h-9 w-9 items-center justify-center", className)}
src/components/ui/pagination.tsx:84:    <MoreHorizontal className="h-4 w-4" />
src/components/ui/tabs.tsx:15:      "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
src/components/ui/card.tsx:9:      className={cn("rounded-xl border bg-card text-card-foreground shadow", className)}
src/components/ui/slider.tsx:12:    className={cn("relative flex w-full touch-none select-none items-center", className)}
src/components/ui/slider.tsx:15:    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20">
src/components/ui/slider.tsx:16:      <SliderPrimitive.Range className="absolute h-full bg-primary" />
src/components/ui/slider.tsx:18:    <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
src/components/ui/popover.tsx:22:        "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-popover-content-transform-origin)",
src/components/ui/progress.tsx:14:    className={cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/20", className)}
src/components/ui/progress.tsx:18:      className="h-full w-full flex-1 bg-primary transition-all"
src/components/ui/input-otp.tsx:42:        "relative flex h-9 w-9 items-center justify-center border-y border-r border-input text-sm shadow-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md",
src/components/ui/input-otp.tsx:51:          <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
src/components/ui/chart.tsx:51:          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
src/components/ui/chart.tsx:162:          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
src/components/ui/chart.tsx:167:        <div className="grid gap-1.5">
src/components/ui/chart.tsx:179:                    "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
src/components/ui/chart.tsx:195:                                "h-2.5 w-2.5": indicator === "dot",
src/components/ui/chart.tsx:196:                                "w-1": indicator === "line",
src/components/ui/chart.tsx:197:                                "w-0 border-[1.5px] border-dashed bg-transparent":
src/components/ui/chart.tsx:217:                        <div className="grid gap-1.5">
src/components/ui/chart.tsx:276:                "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground",
src/components/ui/chart.tsx:283:                  className="h-2 w-2 shrink-0 rounded-[2px]"
src/components/ui/hover-card.tsx:2:import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
src/components/ui/hover-card.tsx:19:      "z-50 w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-hover-card-content-transform-origin)",
src/components/ui/sheet.tsx:34:  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out",
src/components/ui/sheet.tsx:41:        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
src/components/ui/sheet.tsx:43:          "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
src/components/ui/sheet.tsx:65:        <X className="h-4 w-4" />
src/components/ui/scroll-area.tsx:12:    className={cn("relative overflow-hidden", className)}
src/components/ui/scroll-area.tsx:15:    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
src/components/ui/scroll-area.tsx:32:      "flex touch-none select-none transition-colors",
src/components/ui/scroll-area.tsx:33:      orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent p-[1px]",
src/components/ui/scroll-area.tsx:34:      orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent p-[1px]",
src/components/ui/resizable.tsx:8:    className={cn("flex h-full w-full data-[panel-group-direction=vertical]:flex-col", className)}
src/components/ui/resizable.tsx:24:      "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
src/components/ui/resizable.tsx:30:      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
src/components/ui/resizable.tsx:31:        <GripVertical className="h-2.5 w-2.5" />
src/components/ui/sonner.tsx:12:            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
src/components/ui/navigation-menu.tsx:14:    className={cn("relative z-10 flex max-w-max flex-1 items-center justify-center", className)}
src/components/ui/navigation-menu.tsx:38:  "group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=open]:text-accent-foreground data-[state=open]:bg-accent/50 data-[state=open]:hover:bg-accent data-[state=open]:focus:bg-accent",
src/components/ui/navigation-menu.tsx:52:      className="relative top-[1px] ml-1 h-3 w-3 transition duration-300 group-data-[state=open]:rotate-180"
src/components/ui/navigation-menu.tsx:66:      "left-0 top-0 w-full data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 md:absolute md:w-auto ",
src/components/ui/navigation-menu.tsx:83:        "origin-top-center relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90 md:w-[var(--radix-navigation-menu-viewport-width)]",
src/components/ui/navigation-menu.tsx:100:      "top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in",
src/components/ui/navigation-menu.tsx:105:    <div className="relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md" />
src/components/ui/accordion.tsx:31:      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
src/components/ui/accordion.tsx:43:    className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
src/components/ui/drawer.tsx:41:        "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background",
src/components/ui/drawer.tsx:46:      <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
src/components/ui/drawer.tsx:54:  <div className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)} {...props} />
src/components/ui/tooltip.tsx:23:        "z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-tooltip-content-transform-origin)",
src/components/ui/alert.tsx:7:  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
src/components/ui/switch.tsx:12:      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
src/components/ui/switch.tsx:20:        "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
src/components/ui/calendar.tsx:28:        "bg-background group/calendar p-3 [--cell-size:2rem] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
src/components/ui/calendar.tsx:39:        root: cn("w-fit", defaultClassNames.root),
src/components/ui/calendar.tsx:41:        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
src/components/ui/calendar.tsx:43:          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
src/components/ui/calendar.tsx:48:          "h-(--cell-size) w-(--cell-size) select-none p-0 aria-disabled:opacity-50",
src/components/ui/calendar.tsx:53:          "h-(--cell-size) w-(--cell-size) select-none p-0 aria-disabled:opacity-50",
src/components/ui/calendar.tsx:57:          "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
src/components/ui/calendar.tsx:61:          "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium",
src/components/ui/calendar.tsx:65:          "has-focus:border-ring border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] relative rounded-md border",
src/components/ui/calendar.tsx:73:            : "[&>svg]:text-muted-foreground flex h-8 items-center gap-1 rounded-md pl-2 pr-1 text-sm [&>svg]:size-3.5",
src/components/ui/calendar.tsx:76:        table: "w-full border-collapse",
src/components/ui/calendar.tsx:82:        week: cn("mt-2 flex w-full", defaultClassNames.week),
src/components/ui/calendar.tsx:83:        week_number_header: cn("w-(--cell-size) select-none", defaultClassNames.week_number_header),
src/components/ui/calendar.tsx:89:          "group/day relative aspect-square h-full w-full select-none p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md",
src/components/ui/calendar.tsx:168:        "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 flex aspect-square h-auto w-full min-w-(--cell-size) flex-col gap-1 font-normal leading-none data-[range-end=true]:rounded-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] [&>span]:text-xs [&>span]:opacity-70",
src/components/ui/breadcrumb.tsx:72:    className={cn("[&>svg]:w-3.5 [&>svg]:h-3.5", className)}
src/components/ui/breadcrumb.tsx:84:    className={cn("flex h-9 w-9 items-center justify-center", className)}
src/components/ui/breadcrumb.tsx:87:    <MoreHorizontal className="h-4 w-4" />
src/components/ui/radio-group.tsx:11:  return <RadioGroupPrimitive.Root className={cn("grid gap-2", className)} {...props} ref={ref} />;
src/components/ui/radio-group.tsx:23:        "aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
src/components/ui/radio-group.tsx:29:        <Circle className="h-3.5 w-3.5 fill-primary" />
src/components/ui/command.tsx:18:      "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
src/components/ui/command.tsx:29:      <DialogContent className="overflow-hidden p-0">
src/components/ui/command.tsx:30:        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
src/components/ui/command.tsx:43:    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
src/components/ui/command.tsx:47:        "flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
src/components/ui/command.tsx:63:    className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
src/components/ui/command.tsx:86:      "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
src/components/ui/command.tsx:101:    className={cn("-mx-1 h-px bg-border", className)}
src/components/ui/status-badge.tsx:63:  Contacted: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
src/components/ui/status-badge.tsx:74:  Pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
src/components/ui/status-badge.tsx:80:  Waiting: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
src/components/ui/status-badge.tsx:85:  Medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
src/components/ui/avatar.tsx:14:    className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}
src/components/ui/avatar.tsx:26:    className={cn("aspect-square h-full w-full", className)}
src/components/ui/avatar.tsx:39:      "flex h-full w-full items-center justify-center rounded-full bg-muted",
src/components/ui/menubar.tsx:34:      "flex h-9 items-center space-x-1 rounded-md border bg-background p-1 shadow-sm",
src/components/ui/menubar.tsx:73:    <ChevronRight className="ml-auto h-4 w-4" />
src/components/ui/menubar.tsx:85:      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-menubar-content-transform-origin)",
src/components/ui/menubar.tsx:104:        "z-50 min-w-[12rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-menubar-content-transform-origin)",
src/components/ui/menubar.tsx:144:    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
src/components/ui/menubar.tsx:146:        <Check className="h-4 w-4" />
src/components/ui/menubar.tsx:166:    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
src/components/ui/menubar.tsx:168:        <Circle className="h-4 w-4 fill-current" />
src/components/ui/menubar.tsx:196:    className={cn("-mx-1 my-1 h-px bg-muted", className)}
src/components/ui/dialog.tsx:41:        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
src/components/ui/dialog.tsx:48:        <X className="h-4 w-4" />
src/components/ui/sidebar.tsx:133:                "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
src/components/ui/sidebar.tsx:138:              "group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar",
src/components/ui/sidebar.tsx:178:            "flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground",
src/components/ui/sidebar.tsx:195:            className="w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
src/components/ui/sidebar.tsx:207:            <div className="flex h-full w-full flex-col">{children}</div>
src/components/ui/sidebar.tsx:225:            "relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear",
src/components/ui/sidebar.tsx:226:            "group-data-[collapsible=offcanvas]:w-0",
src/components/ui/sidebar.tsx:229:              ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]"
src/components/ui/sidebar.tsx:230:              : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
src/components/ui/sidebar.tsx:235:            "fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex",
src/components/ui/sidebar.tsx:241:              ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)]"
src/components/ui/sidebar.tsx:242:              : "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l",
src/components/ui/sidebar.tsx:249:            className="flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow"
src/components/ui/sidebar.tsx:272:      className={cn("h-7 w-7", className)}
src/components/ui/sidebar.tsx:299:          "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex",
src/components/ui/sidebar.tsx:300:          "[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize",
src/components/ui/sidebar.tsx:301:          "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
src/components/ui/sidebar.tsx:320:          "relative flex w-full flex-1 flex-col bg-background",
src/components/ui/sidebar.tsx:340:        "h-8 w-full bg-background shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
src/components/ui/sidebar.tsx:385:      className={cn("mx-2 w-auto bg-sidebar-border", className)}
src/components/ui/sidebar.tsx:399:          "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
src/components/ui/sidebar.tsx:415:        className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
src/components/ui/sidebar.tsx:434:        "flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
src/components/ui/sidebar.tsx:455:        "absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
src/components/ui/sidebar.tsx:472:      className={cn("w-full text-sm", className)}
src/components/ui/sidebar.tsx:484:      className={cn("flex w-full min-w-0 flex-col gap-1", className)}
src/components/ui/sidebar.tsx:504:  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
src/components/ui/sidebar.tsx:510:          "bg-background shadow-[0_0_0_1px_var(--sidebar-border)] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_var(--sidebar-accent)]",
src/components/ui/sidebar.tsx:513:        default: "h-8 text-sm",
src/components/ui/sidebar.tsx:514:        sm: "h-7 text-xs",
src/components/ui/sidebar.tsx:515:        lg: "h-12 text-sm group-data-[collapsible=icon]:!p-0",
src/components/ui/sidebar.tsx:598:        "absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0",
src/components/ui/sidebar.tsx:621:        "pointer-events-none absolute right-1 flex h-5 min-w-5 select-none items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-sidebar-foreground",
src/components/ui/sidebar.tsx:650:      className={cn("flex h-8 items-center gap-2 rounded-md px-2", className)}
src/components/ui/sidebar.tsx:655:        className="h-4 max-w-(--skeleton-width) flex-1"
src/components/ui/sidebar.tsx:674:        "mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5",
src/components/ui/sidebar.tsx:706:        "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
src/components/ui/table.tsx:7:    <div className="relative w-full overflow-auto">
src/components/ui/table.tsx:8:      <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
src/components/ui/table.tsx:63:      "h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
src/components/ui/separator.tsx:16:      orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
src/components/ui/button.tsx:13:        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
src/components/ui/button.tsx:15:          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
src/components/ui/button.tsx:16:        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
src/components/ui/button.tsx:21:        default: "h-9 px-4 py-2",
src/components/ui/button.tsx:22:        sm: "h-8 rounded-md px-3 text-xs",
src/components/ui/button.tsx:23:        lg: "h-10 rounded-md px-8",
src/components/ui/button.tsx:24:        icon: "h-9 w-9",
src/components/ui/toggle.tsx:14:          "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground",
src/components/ui/toggle.tsx:17:        default: "h-9 px-2 min-w-9",
src/components/ui/toggle.tsx:18:        sm: "h-8 px-1.5 min-w-8",
src/components/ui/toggle.tsx:19:        lg: "h-10 px-2.5 min-w-10",
src/components/ui/checkbox.tsx:14:      "grid place-content-center peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
src/components/ui/checkbox.tsx:19:    <CheckboxPrimitive.Indicator className={cn("grid place-content-center text-current")}>
src/components/ui/checkbox.tsx:20:      <Check className="h-4 w-4" />
src/components/ui/dropdown-menu.tsx:49:      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-dropdown-menu-content-transform-origin)",
src/components/ui/dropdown-menu.tsx:66:        "z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
src/components/ui/dropdown-menu.tsx:107:    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
src/components/ui/dropdown-menu.tsx:109:        <Check className="h-4 w-4" />
src/components/ui/dropdown-menu.tsx:129:    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
src/components/ui/dropdown-menu.tsx:131:        <Circle className="h-2 w-2 fill-current" />
src/components/ui/dropdown-menu.tsx:159:    className={cn("-mx-1 my-1 h-px bg-muted", className)}
src/components/ui/select.tsx:22:      "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
src/components/ui/select.tsx:29:      <ChevronDown className="h-4 w-4 opacity-50" />
src/components/ui/select.tsx:44:    <ChevronUp className="h-4 w-4" />
src/components/ui/select.tsx:58:    <ChevronDown className="h-4 w-4" />
src/components/ui/select.tsx:71:        "relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-select-content-transform-origin)",
src/components/ui/select.tsx:84:            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
src/components/ui/select.tsx:114:      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
src/components/ui/select.tsx:119:    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
src/components/ui/select.tsx:121:        <Check className="h-4 w-4" />
src/components/ui/select.tsx:135:    className={cn("-mx-1 my-1 h-px bg-muted", className)}
src/components/ui/textarea.tsx:10:          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
src/components/ui/input.tsx:11:          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
src/components/ui/context-menu.tsx:35:    <ChevronRight className="ml-auto h-4 w-4" />
src/components/ui/context-menu.tsx:47:      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-context-menu-content-transform-origin)",
src/components/ui/context-menu.tsx:63:        "z-50 max-h-(--radix-context-menu-content-available-height) min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-context-menu-content-transform-origin)",
src/components/ui/context-menu.tsx:103:    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
src/components/ui/context-menu.tsx:105:        <Check className="h-4 w-4" />
src/components/ui/context-menu.tsx:125:    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
src/components/ui/context-menu.tsx:127:        <Circle className="h-4 w-4 fill-current" />
src/components/ui/context-menu.tsx:155:    className={cn("-mx-1 my-1 h-px bg-border", className)}
src/components/ui/carousel.tsx:140:      <div ref={carouselRef} className="overflow-hidden">
src/components/ui/carousel.tsx:166:          "min-w-0 shrink-0 grow-0 basis-full",
src/components/ui/carousel.tsx:187:          "absolute  h-8 w-8 rounded-full",
src/components/ui/carousel.tsx:197:        <ArrowLeft className="h-4 w-4" />
src/components/ui/carousel.tsx:215:          "absolute h-8 w-8 rounded-full",
src/components/ui/carousel.tsx:225:        <ArrowRight className="h-4 w-4" />
src/components/tasks/task-detail-dialog.tsx:228:  if (type.includes("comment")) return <MessageSquare className="h-4 w-4" />;
src/components/tasks/task-detail-dialog.tsx:229:  if (type.includes("checklist")) return <Check className="h-4 w-4" />;
src/components/tasks/task-detail-dialog.tsx:230:  if (type.includes("status")) return <Circle className="h-4 w-4" />;
src/components/tasks/task-detail-dialog.tsx:231:  return <Flag className="h-4 w-4" />;
src/components/tasks/task-detail-dialog.tsx:615:    <div className="grid grid-cols-[22px_108px_minmax(0,1fr)] items-start gap-2 border-b border-slate-200/70 py-2.5 last:border-b-0">
src/components/tasks/task-detail-dialog.tsx:618:      <span className="min-w-0 text-[13px] font-semibold text-slate-900">{value || "—"}</span>
src/components/tasks/task-detail-dialog.tsx:623:    <label className="grid gap-1.5">
src/components/tasks/task-detail-dialog.tsx:632:        <DialogContent className="h-[100dvh] w-screen max-w-none gap-0 overflow-hidden rounded-none border-0 bg-white p-0 shadow-2xl [&>button.absolute.right-4.top-4]:hidden sm:h-auto sm:max-h-[92vh] sm:w-[calc(100vw-24px)] sm:max-w-[980px] sm:rounded-[18px] sm:border">
src/components/tasks/task-detail-dialog.tsx:634:          <div ref={legacyContentRef} className="pointer-events-none absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden opacity-0">
src/components/tasks/task-detail-dialog.tsx:638:          <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white sm:max-h-[92vh]">
src/components/tasks/task-detail-dialog.tsx:641:                <div className="min-w-0 flex-1">
src/components/tasks/task-detail-dialog.tsx:642:                  <div className="flex min-w-0 flex-wrap items-center gap-2">
src/components/tasks/task-detail-dialog.tsx:644:                      <Input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} className="h-10 max-w-2xl text-lg font-extrabold" />
src/components/tasks/task-detail-dialog.tsx:646:                      <h2 className="min-w-0 text-[19px] font-extrabold leading-tight tracking-[-0.025em] text-slate-900 sm:text-[20px]">
src/components/tasks/task-detail-dialog.tsx:669:                      <Button className="hidden h-9 px-3 text-sm sm:inline-flex" onClick={() => void (onComplete ? onComplete() : updateTask({ status: "Completed" }))} disabled={!task?.id || task.status === "Completed" || !canEdit}>
src/components/tasks/task-detail-dialog.tsx:670:                        <Check className="mr-2 h-4 w-4" /> Completar
src/components/tasks/task-detail-dialog.tsx:672:                      <Button className="h-9 px-3 text-sm" variant="outline" onClick={() => void (onSetInProgress ? onSetInProgress() : updateTask({ status: "In Progress" }))} disabled={!task?.id || task.status === "In Progress" || !canEdit}>
src/components/tasks/task-detail-dialog.tsx:673:                        <Circle className="mr-2 h-4 w-4" /> En progreso
src/components/tasks/task-detail-dialog.tsx:675:                      <Button className="h-9 px-3 text-sm" variant="outline" onClick={() => setEditing(true)} disabled={!task?.id || !canEdit}>
src/components/tasks/task-detail-dialog.tsx:676:                        <Pencil className="mr-2 h-4 w-4" /> Editar
src/components/tasks/task-detail-dialog.tsx:680:                  <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Cerrar detalle de tarea"><X className="h-5 w-5" /></Button>
src/components/tasks/task-detail-dialog.tsx:685:            <main className="min-h-0 flex-1 overflow-y-auto bg-white">
src/components/tasks/task-detail-dialog.tsx:689:                <div className="grid min-h-full grid-cols-1 lg:grid-cols-[minmax(0,1fr)_302px]">
src/components/tasks/task-detail-dialog.tsx:690:                  <section className="min-w-0 space-y-6 px-5 py-5 lg:border-r">
src/components/tasks/task-detail-dialog.tsx:691:                    <section>
src/components/tasks/task-detail-dialog.tsx:694:                        {!editing ? <Button size="sm" variant="ghost" className="h-8 gap-1 text-slate-500" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /> Editar</Button> : null}
src/components/tasks/task-detail-dialog.tsx:697:                        <Textarea value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} className="min-h-[230px] text-sm leading-6" placeholder="Escribe aquí el brief, instrucciones, copy y detalles de la tarea..." />
src/components/tasks/task-detail-dialog.tsx:704:                    </section>
src/components/tasks/task-detail-dialog.tsx:706:                    <section>
src/components/tasks/task-detail-dialog.tsx:712:                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => document.getElementById("task-new-checklist-item")?.focus()} aria-label="Agregar subtarea"><Plus className="h-4 w-4" /></Button>
src/components/tasks/task-detail-dialog.tsx:714:                      <Progress value={checklistProgress} className="mb-4 h-2" />
src/components/tasks/task-detail-dialog.tsx:716:                        <Input id="task-new-checklist-item" value={newChecklistTitle} onChange={(e) => setNewChecklistTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void addChecklistItem(); }} placeholder="Add a checklist item..." />
src/components/tasks/task-detail-dialog.tsx:724:                            <div key={item.id} className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-start gap-3 px-3 py-3 hover:bg-slate-50">
src/components/tasks/task-detail-dialog.tsx:725:                              <button type="button" onClick={() => void toggleChecklistItem(item)} className={"mt-0.5 grid h-5 w-5 place-items-center rounded-full border text-[10px] " + (item.is_completed ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-transparent")}><Check className="h-3.5 w-3.5" /></button>
src/components/tasks/task-detail-dialog.tsx:730:                              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-600" onClick={() => void deleteChecklistItem(item)}><Trash2 className="h-3.5 w-3.5" /></Button>
src/components/tasks/task-detail-dialog.tsx:735:                    </section>
src/components/tasks/task-detail-dialog.tsx:737:                    <section>
src/components/tasks/task-detail-dialog.tsx:742:                        <Textarea value={newCommentBody} onChange={(e) => setNewCommentBody(e.target.value)} placeholder="Write an internal comment..." className="min-h-[96px]" />
src/components/tasks/task-detail-dialog.tsx:747:                          <div key={comment.id} className="grid grid-cols-[34px_minmax(0,1fr)] gap-3 border-b pb-3 last:border-b-0">
src/components/tasks/task-detail-dialog.tsx:748:                            <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">IC</div>
src/components/tasks/task-detail-dialog.tsx:749:                            <div className="min-w-0"><div className="mb-1 text-xs font-bold text-slate-500">{formatDateTime(comment.created_at)}</div><div className="whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">{comment.body}</div></div>
src/components/tasks/task-detail-dialog.tsx:753:                    </section>
src/components/tasks/task-detail-dialog.tsx:754:                  </section>
src/components/tasks/task-detail-dialog.tsx:756:                  <aside className="min-w-0 bg-slate-50/70 px-5 py-5">
src/components/tasks/task-detail-dialog.tsx:757:                    <section className="rounded-xl border bg-white p-4 shadow-sm">
src/components/tasks/task-detail-dialog.tsx:759:                        <h3 className="flex items-center gap-2 text-[15px] font-extrabold text-slate-900"><Star className="h-4 w-4 text-slate-400" /> Task Info</h3>
src/components/tasks/task-detail-dialog.tsx:775:                          {renderInfoRow("Status", <StatusBadge status={task?.status || "—"} />, <Star className="h-4 w-4" />)}
src/components/tasks/task-detail-dialog.tsx:776:                          {renderInfoRow("Created", formatDate(task?.created_at), <CalendarDays className="h-4 w-4" />)}
src/components/tasks/task-detail-dialog.tsx:777:                          {renderInfoRow("Due Date", formatDate(task?.due_date), <CalendarDays className="h-4 w-4" />)}
src/components/tasks/task-detail-dialog.tsx:778:                          {renderInfoRow("Priority", <span className={priorityTone(task?.priority)}>{task?.priority || "—"}</span>, <Flag className="h-4 w-4" />)}
src/components/tasks/task-detail-dialog.tsx:779:                          {renderInfoRow("Assignee", assigneeLabel, <User className="h-4 w-4" />)}
src/components/tasks/task-detail-dialog.tsx:780:                          {renderInfoRow("Project", <span className="break-words">{displayProjectName}</span>, <FolderKanban className="h-4 w-4" />)}
src/components/tasks/task-detail-dialog.tsx:781:                          {renderInfoRow("Client", <span className="break-words">{displayClientName}</span>, <Users className="h-4 w-4" />)}
src/components/tasks/task-detail-dialog.tsx:782:                          {renderInfoRow("Product", <span className="break-words">{displayProductName}</span>, <FileText className="h-4 w-4" />)}
src/components/tasks/task-detail-dialog.tsx:785:                    </section>
src/components/tasks/task-detail-dialog.tsx:787:                    <section className="mt-4 rounded-xl border bg-white p-4 shadow-sm">
src/components/tasks/task-detail-dialog.tsx:790:                          <h3 className="flex items-center gap-2 text-[15px] font-extrabold text-slate-900"><Clock3 className="h-4 w-4 text-slate-400" /> Activity</h3>
src/components/tasks/task-detail-dialog.tsx:797:                        <div className="relative max-h-[260px] space-y-4 overflow-auto pr-2 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-px before:bg-slate-200">
src/components/tasks/task-detail-dialog.tsx:799:                            <div key={event.id} className="relative grid grid-cols-[32px_minmax(0,1fr)] gap-3">
src/components/tasks/task-detail-dialog.tsx:800:                              <div className={"relative z-10 grid h-8 w-8 place-items-center rounded-full border " + (index === 0 ? "border-blue-200 bg-blue-50 text-blue-600" : "border-slate-200 bg-white text-slate-500")}>{eventIcon(event.event_type)}</div>
src/components/tasks/task-detail-dialog.tsx:801:                              <div className="min-w-0">
src/components/tasks/task-detail-dialog.tsx:810:                    </section>
src/components/tasks/task-detail-dialog.tsx:812:                    <section className="mt-4 rounded-xl border bg-white p-4 shadow-sm">
src/components/tasks/task-detail-dialog.tsx:815:                          <h3 className="flex items-center gap-2 text-[15px] font-extrabold text-slate-900"><Paperclip className="h-4 w-4 text-slate-400" /> Attachments</h3>
src/components/tasks/task-detail-dialog.tsx:820:                          <Upload className="mr-2 h-4 w-4" />{isUploadingFile ? `${uploadProgress}%` : "Upload"}
src/components/tasks/task-detail-dialog.tsx:829:                          <Progress value={uploadProgress} className="h-2" />
src/components/tasks/task-detail-dialog.tsx:836:                            <Link2 className="h-4 w-4" />
src/components/tasks/task-detail-dialog.tsx:851:                                <div className="grid grid-cols-[32px_minmax(0,1fr)] items-center gap-2">
src/components/tasks/task-detail-dialog.tsx:852:                                  <div className="grid h-8 w-8 place-items-center rounded-lg border bg-white text-slate-500">{file.icon_link ? <img src={file.icon_link} alt="" className="h-5 w-5" /> : <Paperclip className="h-4 w-4" />}</div>
src/components/tasks/task-detail-dialog.tsx:853:                                  <div className="min-w-0"><div className="truncate text-sm font-extrabold text-slate-900">{file.name}</div><div className="text-xs font-semibold text-slate-500">{formatBytes(file.size_bytes)} · {formatDate(file.created_at)}</div></div>
src/components/tasks/task-detail-dialog.tsx:857:                                  {url ? <Button size="sm" variant="outline" asChild><a href={url} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Open</a></Button> : null}
src/components/tasks/task-detail-dialog.tsx:858:                                  <Button size="sm" variant="outline" onClick={() => void copyFileLink(file)}><Copy className="mr-1.5 h-3.5 w-3.5" />Copy</Button>
src/components/tasks/task-detail-dialog.tsx:859:                                  {onDeleteDriveFile ? <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => void onDeleteDriveFile(file)}><Trash2 className="h-4 w-4" /></Button> : <Button size="icon" variant="ghost" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>}
src/components/tasks/task-detail-dialog.tsx:866:                    </section>
src/components/tasks/task-detail-dialog.tsx:876:        <DialogContent className="h-[92dvh] w-[calc(100vw-20px)] max-w-[1040px] gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl">
src/components/tasks/task-detail-dialog.tsx:879:            <div className="min-w-0"><div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Preview de Drive</div><div className="truncate text-sm font-semibold text-slate-900">{previewFile?.title || "Archivo"}</div></div>
src/components/tasks/task-detail-dialog.tsx:882:          {previewFile?.url ? <iframe src={previewFile.url} title={previewFile.title || "Preview de Drive"} className="h-[calc(92dvh-57px)] w-full border-0 bg-slate-100" allow="autoplay" /> : null}
src/components/sales/sales-basic-page.tsx:296:      <div className="grid gap-3 sm:grid-cols-4">
src/components/sales/sales-basic-page.tsx:303:      <div className="rounded-xl border bg-white p-4 shadow-sm">
src/components/sales/sales-basic-page.tsx:307:              <RefreshCw className="mr-2 h-4 w-4" />
src/components/sales/sales-basic-page.tsx:312:                <Plus className="mr-2 h-4 w-4" />
src/components/sales/sales-basic-page.tsx:317:          <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
src/components/sales/sales-basic-page.tsx:319:              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
src/components/sales/sales-basic-page.tsx:342:        <div className="overflow-hidden rounded-xl border">
src/components/sales/sales-basic-page.tsx:343:          <div className="overflow-x-auto">
src/components/sales/sales-basic-page.tsx:406:        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
src/components/sales/sales-basic-page.tsx:411:            <div className="grid gap-4 sm:grid-cols-2">
src/components/sales/sales-basic-page.tsx:439:    <div className="rounded-xl border bg-white p-4 shadow-sm">
src/components/sales/sales-basic-page.tsx:458:    field.span === 2 || field.type === "textarea" ? "space-y-1.5 sm:col-span-2" : "space-y-1.5";
src/components/invoices/PublicInvoiceView.tsx:106:    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_-10%,rgba(103,162,255,0.25),transparent_32%),radial-gradient(circle_at_100%_0%,rgba(29,98,249,0.22),transparent_28%),linear-gradient(180deg,#020918_0%,#06142b_42%,#0b2e73_100%)] px-2.5 py-[18px] text-[#101828] print:bg-white print:p-0">
src/components/invoices/PublicInvoiceView.tsx:121:              min-height: 6.8in !important;
src/components/invoices/PublicInvoiceView.tsx:140:      <div className="mx-auto w-full max-w-[430px]">
src/components/invoices/PublicInvoiceView.tsx:145:            className="inline-flex min-h-[43px] items-center justify-center gap-2 rounded-[13px] border border-[#dce6f3] bg-white px-[15px] text-[13px] font-[680] tracking-[0.002em] text-[#101828] shadow-[0_8px_20px_rgba(10,32,80,0.08)] transition-transform hover:-translate-y-px"
src/components/invoices/PublicInvoiceView.tsx:156:              className="inline-flex min-h-[43px] items-center justify-center gap-2 rounded-[13px] bg-[linear-gradient(180deg,#1d62f9,#0f4de6)] px-[15px] text-[13px] font-[680] tracking-[0.002em] text-white no-underline shadow-[0_12px_24px_rgba(29,98,249,0.28)] transition-transform hover:-translate-y-px"
src/components/invoices/PublicInvoiceView.tsx:164:        <article className="invoice-voucher relative flex min-h-[805px] w-full flex-col overflow-hidden rounded-[30px] border border-[rgba(220,230,243,0.96)] bg-white shadow-[0_28px_70px_rgba(10,32,80,0.16)] before:absolute before:-left-3.5 before:top-[345px] before:z-[5] before:h-7 before:w-7 before:rounded-full before:border before:border-[rgba(220,230,243,0.96)] before:bg-[#f2f5fa] after:absolute after:-right-3.5 after:top-[345px] after:z-[5] after:h-7 after:w-7 after:rounded-full after:border after:border-[rgba(220,230,243,0.96)] after:bg-[#f2f5fa]">
src/components/invoices/PublicInvoiceView.tsx:165:          <header className="invoice-hero relative isolate min-h-[230px] overflow-hidden bg-[radial-gradient(circle_at_86%_20%,rgba(29,98,249,0.52),transparent_32%),linear-gradient(135deg,#030b1d_0%,#07152e_57%,#0b3c94_100%)] px-5 pb-[22px] pt-6 text-white before:absolute before:inset-0 before:-z-10 before:translate-x-[106px] before:-translate-y-2 before:bg-[linear-gradient(30deg,transparent_0_47%,rgba(255,255,255,0.07)_48%_49%,transparent_50%),linear-gradient(150deg,transparent_0_47%,rgba(255,255,255,0.05)_48%_49%,transparent_50%)] before:bg-[length:78px_78px] before:opacity-55">
src/components/invoices/PublicInvoiceView.tsx:171:                  className="h-7 w-auto max-w-[150px] object-contain"
src/components/invoices/PublicInvoiceView.tsx:175:              <div className="inline-flex min-h-8 items-center gap-[7px] whitespace-nowrap rounded-full border border-white/25 bg-white/10 px-[13px] text-[11.8px] font-[680] leading-none text-white">
src/components/invoices/PublicInvoiceView.tsx:176:                <span className={`h-[7px] w-[7px] rounded-full ${statusInfo.dotClass}`} />
src/components/invoices/PublicInvoiceView.tsx:186:              <div className="grid gap-1 pb-1 text-right">
src/components/invoices/PublicInvoiceView.tsx:196:            <div className="mt-6 grid grid-cols-2 gap-2.5">
src/components/invoices/PublicInvoiceView.tsx:203:            <section
src/components/invoices/PublicInvoiceView.tsx:205:              className="mx-5 -mt-5 mb-5 overflow-hidden rounded-[24px] border border-[#d8e5f7] bg-white shadow-[0_22px_55px_rgba(10,32,80,0.14)] print:hidden"
src/components/invoices/PublicInvoiceView.tsx:209:                  <div className="min-w-0">
src/components/invoices/PublicInvoiceView.tsx:218:                    <p className="mt-2 max-w-[360px] text-[12.5px] font-medium leading-relaxed text-[#667085]">
src/components/invoices/PublicInvoiceView.tsx:223:                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[18px] bg-[#fef7df]">
src/components/invoices/PublicInvoiceView.tsx:227:                      className="h-8 w-8 object-contain"
src/components/invoices/PublicInvoiceView.tsx:251:                    <span className="mt-[2px] inline-block h-2 w-2 shrink-0 rounded-full bg-[#1d62f9]" />
src/components/invoices/PublicInvoiceView.tsx:257:            </section>
src/components/invoices/PublicInvoiceView.tsx:260:          <section className="grid flex-1 content-start gap-[13px] bg-[linear-gradient(180deg,#fff_0%,#fbfdff_100%)] px-3.5 py-4">
src/components/invoices/PublicInvoiceView.tsx:261:            <div className="grid grid-cols-2 gap-[11px] max-[380px]:grid-cols-1">
src/components/invoices/PublicInvoiceView.tsx:266:            <div className="grid grid-cols-2 gap-[11px] max-[380px]:grid-cols-1">
src/components/invoices/PublicInvoiceView.tsx:271:            <section className="overflow-hidden rounded-[19px] border border-[#dce6f3] bg-white">
src/components/invoices/PublicInvoiceView.tsx:272:              <div className="grid min-h-[39px] grid-cols-[25px_1fr_54px_68px] items-center gap-2 bg-[linear-gradient(180deg,#1d62f9,#0f4de6)] px-[13px] text-[9.7px] font-[720] uppercase tracking-[0.08em] text-white max-[380px]:grid-cols-[22px_1fr_44px_58px]">
src/components/invoices/PublicInvoiceView.tsx:287:                    className="grid min-h-[95px] grid-cols-[25px_1fr_54px_68px] items-start gap-2 border-b border-dashed border-[#d8e3f2] px-[13px] py-[17px] last:border-b-0 max-[380px]:grid-cols-[22px_1fr_44px_58px]"
src/components/invoices/PublicInvoiceView.tsx:289:                    <div className="grid h-[22px] w-[22px] place-items-center rounded-lg bg-[#eef5ff] text-[10.5px] font-[750] text-[#1d62f9]">
src/components/invoices/PublicInvoiceView.tsx:314:            </section>
src/components/invoices/PublicInvoiceView.tsx:316:            <section className="grid gap-[13px]">
src/components/invoices/PublicInvoiceView.tsx:317:              <div className="min-h-[92px] rounded-[18px] border border-[#dbe9ff] bg-[radial-gradient(circle_at_100%_0%,rgba(29,98,249,0.12),transparent_42%),#f7faff] p-3.5">
src/components/invoices/PublicInvoiceView.tsx:326:              <div className="overflow-hidden rounded-[18px] border border-[#dce6f3] bg-white">
src/components/invoices/PublicInvoiceView.tsx:337:                <div className="flex min-h-[58px] items-center justify-between bg-[linear-gradient(180deg,#06142b,#020918)] px-3.5 text-white">
src/components/invoices/PublicInvoiceView.tsx:344:            </section>
src/components/invoices/PublicInvoiceView.tsx:345:          </section>
src/components/invoices/PublicInvoiceView.tsx:347:          <footer className="grid grid-cols-[1fr_auto] items-center gap-3.5 bg-white px-3.5 pb-4">
src/components/invoices/PublicInvoiceView.tsx:355:            <div className="h-[58px] w-[58px] rounded-[13px] border border-[#dce6f3] bg-[linear-gradient(90deg,#101828_8px,transparent_8px)_0_0/16px_16px,linear-gradient(#101828_8px,transparent_8px)_0_0/16px_16px,#fff] opacity-85" />
src/components/invoices/PublicInvoiceView.tsx:365:    <article className="min-h-[132px] rounded-[18px] border border-[#dce6f3] bg-white px-[13px] pb-3.5 pt-[15px]">
src/components/invoices/PublicInvoiceView.tsx:381:    <div className="min-h-[66px] rounded-2xl border border-[#dce6f3] bg-[#f5f8fc] px-3 py-3">
src/components/invoices/PublicInvoiceView.tsx:394:    <div className="min-h-[58px] rounded-[17px] border border-white/15 bg-white/10 p-3 backdrop-blur-xl">
src/components/invoices/PublicInvoiceView.tsx:405:    <div className="flex min-h-9 items-center justify-between border-b border-[#edf2f7] px-3.5 text-[11.8px] font-semibold text-[#667085]">
src/components/invoices/PublicInvoiceView.tsx:452:    return { label: "Pagada", dotClass: "bg-[#12b76a] shadow-[0_0_0_4px_rgba(18,183,106,0.18)]" };
src/components/invoices/PublicInvoiceView.tsx:455:    return { label: "Vencida", dotClass: "bg-[#f04438] shadow-[0_0_0_4px_rgba(240,68,56,0.18)]" };
src/components/invoices/PublicInvoiceView.tsx:460:      dotClass: "bg-[#98a2b3] shadow-[0_0_0_4px_rgba(152,162,179,0.18)]",
src/components/invoices/PublicInvoiceView.tsx:464:    return { label: "Enviada", dotClass: "bg-[#1d62f9] shadow-[0_0_0_4px_rgba(29,98,249,0.18)]" };
src/components/invoices/PublicInvoiceView.tsx:468:    dotClass: "bg-[#f79009] shadow-[0_0_0_4px_rgba(247,144,9,0.18)]",
src/components/invoices/PublicInvoiceView.tsx:476:      height="17"
src/components/invoices/PublicInvoiceView.tsx:483:      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
src/components/invoices/PublicInvoiceView.tsx:493:      height="17"
src/components/invoices/PayPalInvoiceButton.tsx:73:              layout: "vertical",
src/components/invoices/PayPalInvoiceButton.tsx:77:              height: 45,
src/components/invoices/PayPalInvoiceButton.tsx:145:        className="inline-flex h-12 min-w-[170px] items-center justify-center rounded-[14px] bg-[#ffc439] px-5 shadow-[0_14px_28px_rgba(255,196,57,0.30)]"
src/components/invoices/PayPalInvoiceButton.tsx:150:          className="h-6 w-auto object-contain"
src/components/invoices/PayPalInvoiceButton.tsx:157:    <div className="min-w-[170px]">
src/components/spreadsheet-builder/spreadsheet-builder-test.tsx:98:    <div className="h-[calc(100vh-88px)] w-full bg-white">
src/components/spreadsheet-builder/spreadsheet-builder-test.tsx:99:      <div ref={containerRef} className="h-full w-full" />
src/components/layout/app-sidebar.tsx:243:  "h-10 rounded-2xl px-3 text-slate-900 transition-all hover:bg-[#f1f5ff] hover:text-slate-950 data-[active=true]:bg-[#eaf1ff] data-[active=true]:font-semibold data-[active=true]:text-slate-950 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-2xl group-data-[mobile=true]:mx-0 group-data-[mobile=true]:!h-10 group-data-[mobile=true]:!w-full group-data-[mobile=true]:!justify-start group-data-[mobile=true]:!px-3";
src/components/layout/app-sidebar.tsx:245:  "flex w-full items-center gap-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[mobile=true]:justify-start group-data-[mobile=true]:gap-3";
src/components/layout/app-sidebar.tsx:247:  "h-8 rounded-xl px-3 text-slate-700 transition-colors hover:bg-[#f7f9ff] data-[active=true]:bg-[#eef4ff] data-[active=true]:font-semibold data-[active=true]:text-slate-950 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center group-data-[mobile=true]:mx-0 group-data-[mobile=true]:!h-9 group-data-[mobile=true]:!w-full group-data-[mobile=true]:!justify-start group-data-[mobile=true]:!px-3";
src/components/layout/app-sidebar.tsx:281:    window.addEventListener("resize", updatePosition);
src/components/layout/app-sidebar.tsx:284:      window.removeEventListener("resize", updatePosition);
src/components/layout/app-sidebar.tsx:292:      className="pointer-events-none invisible fixed z-50 min-w-60 rounded-2xl border border-slate-200 bg-white p-2 opacity-0 shadow-2xl shadow-slate-900/15 transition-[opacity,visibility] duration-150 group-hover/menu-item:pointer-events-auto group-hover/menu-item:visible group-hover/menu-item:opacity-100 group-focus-within/menu-item:pointer-events-auto group-focus-within/menu-item:visible group-focus-within/menu-item:opacity-100"
src/components/layout/app-sidebar.tsx:299:        className="space-y-1 overflow-auto pr-1"
src/components/layout/app-sidebar.tsx:306:            "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-[#f1f5ff] hover:text-slate-950";
src/components/layout/app-sidebar.tsx:315:                <Icon className={"h-4 w-4 shrink-0 " + (item.iconClassName || "")} />
src/components/layout/app-sidebar.tsx:316:                <span className="min-w-0 flex-1 truncate text-left">{childLabel}</span>
src/components/layout/app-sidebar.tsx:329:              <Icon className={"h-4 w-4 shrink-0 " + (item.iconClassName || "")} />
src/components/layout/app-sidebar.tsx:330:              <span className="min-w-0 flex-1 truncate">{childLabel}</span>
src/components/layout/app-sidebar.tsx:393:          className="group-data-[collapsible=icon]:w-full"
src/components/layout/app-sidebar.tsx:400:              <Icon className={"h-4 w-4 shrink-0 " + (item.iconClassName || "")} />
src/components/layout/app-sidebar.tsx:415:        className="group-data-[collapsible=icon]:w-full"
src/components/layout/app-sidebar.tsx:431:                (child ? "h-4 w-4 " : "h-[18px] w-[18px] ") +
src/components/layout/app-sidebar.tsx:476:            className="group-data-[collapsible=icon]:w-full group/menu-item relative"
src/components/layout/app-sidebar.tsx:491:                <Icon className="h-[18px] w-[18px] shrink-0 text-slate-900" />
src/components/layout/app-sidebar.tsx:496:                      "ml-auto h-4 w-4 shrink-0 text-slate-500 transition-transform " +
src/components/layout/app-sidebar.tsx:539:              className="h-7 w-auto max-w-[160px] object-contain"
src/components/layout/app-sidebar.tsx:543:            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#eef4ff] shadow-[inset_0_0_0_1px_rgba(29,98,249,0.14)]">
src/components/layout/app-sidebar.tsx:544:              <img src="/imagotipo_corevix.svg" alt="Corevix" className="h-5 w-5 object-contain" />
src/components/layout/app-sidebar.tsx:549:      <SidebarContent className="px-2 group-data-[collapsible=icon]:overflow-visible group-data-[collapsible=icon]:px-2">
src/components/layout/app-sidebar.tsx:606:          <SidebarMenuItem className="group-data-[collapsible=icon]:w-full">
src/components/layout/app-sidebar.tsx:611:              className="h-12 rounded-2xl px-2 text-slate-900 transition-all hover:bg-[#f1f5ff] data-[active=true]:bg-[#eaf1ff] group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center group-data-[mobile=true]:!h-12 group-data-[mobile=true]:!w-full group-data-[mobile=true]:!justify-start group-data-[mobile=true]:!px-2"
src/components/layout/app-sidebar.tsx:615:                className="flex w-full min-w-0 items-center gap-2 group-data-[collapsible=icon]:justify-center group-data-[mobile=true]:justify-start"
src/components/layout/app-sidebar.tsx:619:                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-950 text-xs font-black text-white">
src/components/layout/app-sidebar.tsx:623:                  <span className="min-w-0 flex-1 text-left">
src/components/layout/app-sidebar.tsx:643:                className="h-9 rounded-xl px-3 text-slate-600 hover:bg-rose-50 hover:text-rose-700"
src/components/layout/app-sidebar.tsx:646:                <span className="flex w-full items-center gap-3">
src/components/layout/app-sidebar.tsx:647:                  <LogOut className="h-4 w-4 shrink-0" />
src/components/layout/top-bar.tsx:98:    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card px-4">
src/components/layout/top-bar.tsx:101:      <div className="relative flex-1 max-w-md">
src/components/layout/top-bar.tsx:102:        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
src/components/layout/top-bar.tsx:105:          className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
src/components/layout/top-bar.tsx:113:          className="h-9 px-3 text-xs gap-2"
src/components/layout/top-bar.tsx:118:          <PlayCircle className="h-4 w-4" />
src/components/layout/top-bar.tsx:124:          className="h-9 px-2.5 text-xs"
src/components/layout/top-bar.tsx:134:            <Button variant="ghost" size="icon" className="relative h-9 w-9">
src/components/layout/top-bar.tsx:135:              <Bell className="h-4 w-4" />
src/components/layout/top-bar.tsx:137:                <Badge className="absolute -right-0.5 -top-0.5 h-4 min-w-4 px-1 text-[10px] bg-destructive text-destructive-foreground">
src/components/layout/top-bar.tsx:143:          <DropdownMenuContent align="end" className="w-80">
src/components/layout/top-bar.tsx:176:            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
src/components/layout/top-bar.tsx:177:              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
src/components/layout/top-bar.tsx:182:          <DropdownMenuContent align="end" className="w-56">
src/components/layout/top-bar.tsx:190:                <User className="h-4 w-4" />
src/components/layout/top-bar.tsx:196:              <LogOut className="h-4 w-4 mr-2" />
src/components/dashboard-builder/dashboard-builder.tsx:4:import { ResponsiveGridLayout, useContainerWidth } from "react-grid-layout";
src/components/dashboard-builder/dashboard-builder.tsx:5:import type { Layout, LayoutItem, ResponsiveLayouts } from "react-grid-layout";
src/components/dashboard-builder/dashboard-builder.tsx:6:import "react-grid-layout/css/styles.css";
src/components/dashboard-builder/dashboard-builder.tsx:24:  DashboardGridLayoutItem,
src/components/dashboard-builder/dashboard-builder.tsx:32:} from "./widget-registry";
src/components/dashboard-builder/dashboard-builder.tsx:33:import { useDashboardLayout } from "./use-dashboard-layout";
src/components/dashboard-builder/dashboard-builder.tsx:54:function toGridLayouts(preferences: DashboardWidgetPreference[], renderableIds: Set<string>) {
src/components/dashboard-builder/dashboard-builder.tsx:55:  const layouts: ResponsiveLayouts<DashboardBreakpoint> = {};
src/components/dashboard-builder/dashboard-builder.tsx:58:    layouts[breakpoint] = preferences
src/components/dashboard-builder/dashboard-builder.tsx:59:      .filter((preference) => preference.enabled && renderableIds.has(preference.widgetId))
src/components/dashboard-builder/dashboard-builder.tsx:60:      .map((preference) => preference.layout[breakpoint])
src/components/dashboard-builder/dashboard-builder.tsx:61:      .filter((item): item is DashboardGridLayoutItem => Boolean(item))
src/components/dashboard-builder/dashboard-builder.tsx:69:  return layouts;
src/components/dashboard-builder/dashboard-builder.tsx:75:  layouts: ResponsiveLayouts<DashboardBreakpoint>,
src/components/dashboard-builder/dashboard-builder.tsx:78:    const nextLayout = { ...preference.layout };
src/components/dashboard-builder/dashboard-builder.tsx:79:    const currentItem = currentLayout.find((layoutItem) => layoutItem.i === preference.widgetId);
src/components/dashboard-builder/dashboard-builder.tsx:82:      const item = layouts[breakpoint]?.find((layoutItem) => layoutItem.i === preference.widgetId);
src/components/dashboard-builder/dashboard-builder.tsx:96:      } satisfies DashboardGridLayoutItem;
src/components/dashboard-builder/dashboard-builder.tsx:102:      layout: nextLayout,
src/components/dashboard-builder/dashboard-builder.tsx:111:function DashboardGridItemShell({ children }: { children: ReactNode }) {
src/components/dashboard-builder/dashboard-builder.tsx:112:  return <div className="h-full min-h-0 overflow-hidden">{children}</div>;
src/components/dashboard-builder/dashboard-builder.tsx:124:  onEnabledChange: (widgetId: string, enabled: boolean) => void;
src/components/dashboard-builder/dashboard-builder.tsx:126:  const options = preferences.filter((preference) => renderableIds.has(preference.widgetId));
src/components/dashboard-builder/dashboard-builder.tsx:130:    <SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-[460px]">
src/components/dashboard-builder/dashboard-builder.tsx:133:        <SheetDescription>Activa los widgets que quieres ver en tu dashboard.</SheetDescription>
src/components/dashboard-builder/dashboard-builder.tsx:143:      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4">
src/components/dashboard-builder/dashboard-builder.tsx:145:          const definition = getDashboardWidgetDefinition(preference.widgetId);
src/components/dashboard-builder/dashboard-builder.tsx:150:              key={preference.widgetId}
src/components/dashboard-builder/dashboard-builder.tsx:152:                "rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition",
src/components/dashboard-builder/dashboard-builder.tsx:157:                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-600">
src/components/dashboard-builder/dashboard-builder.tsx:158:                  <Icon className="h-4 w-4" />
src/components/dashboard-builder/dashboard-builder.tsx:161:                <div className="min-w-0 flex-1">
src/components/dashboard-builder/dashboard-builder.tsx:163:                    <div className="min-w-0">
src/components/dashboard-builder/dashboard-builder.tsx:165:                        {definition?.title || preference.widgetId}
src/components/dashboard-builder/dashboard-builder.tsx:175:                      onCheckedChange={(checked) => onEnabledChange(preference.widgetId, checked)}
src/components/dashboard-builder/dashboard-builder.tsx:176:                      aria-label={`Mostrar ${definition?.title || preference.widgetId}`}
src/components/dashboard-builder/dashboard-builder.tsx:195:export function DashboardBuilder({ widgets }: { widgets: DashboardWidgetRenderItem[] }) {
src/components/dashboard-builder/dashboard-builder.tsx:202:  const layoutChangeReadyRef = useRef(false);
src/components/dashboard-builder/dashboard-builder.tsx:203:  const widgetById = useMemo(
src/components/dashboard-builder/dashboard-builder.tsx:204:    () => new Map(widgets.map((widget) => [widget.id, widget])),
src/components/dashboard-builder/dashboard-builder.tsx:205:    [widgets],
src/components/dashboard-builder/dashboard-builder.tsx:207:  const renderableIds = useMemo(() => new Set(widgets.map((widget) => widget.id)), [widgets]);
src/components/dashboard-builder/dashboard-builder.tsx:213:    (preference) => preference.enabled && renderableIds.has(preference.widgetId),
src/components/dashboard-builder/dashboard-builder.tsx:215:  const layouts = useMemo(
src/components/dashboard-builder/dashboard-builder.tsx:216:    () => toGridLayouts(normalizedPreferences, renderableIds),
src/components/dashboard-builder/dashboard-builder.tsx:219:  const gridWidth = mounted && width > 0 ? width : 1280;
src/components/dashboard-builder/dashboard-builder.tsx:225:    if (!layoutChangeReadyRef.current) {
src/components/dashboard-builder/dashboard-builder.tsx:226:      layoutChangeReadyRef.current = true;
src/components/dashboard-builder/dashboard-builder.tsx:239:    widgetId: string,
src/components/dashboard-builder/dashboard-builder.tsx:243:      preference.widgetId === widgetId ? { ...preference, ...patch } : preference,
src/components/dashboard-builder/dashboard-builder.tsx:251:      <div className="grid min-h-[420px] place-items-center p-6 text-sm font-medium text-slate-500">
src/components/dashboard-builder/dashboard-builder.tsx:258:    <div ref={containerRef} className="min-h-0 bg-[#f8fafc]">
src/components/dashboard-builder/dashboard-builder.tsx:260:        <div className="min-w-0">
src/components/dashboard-builder/dashboard-builder.tsx:265:            Arrastra desde el icono lateral o redimensiona widgets. Los cambios se guardan
src/components/dashboard-builder/dashboard-builder.tsx:274:                <SlidersHorizontal className="h-3.5 w-3.5" />
src/components/dashboard-builder/dashboard-builder.tsx:282:              onEnabledChange={(widgetId, enabled) => updateWidgetPreference(widgetId, { enabled })}
src/components/dashboard-builder/dashboard-builder.tsx:295:            <RotateCcw className="h-3.5 w-3.5" />
src/components/dashboard-builder/dashboard-builder.tsx:308:        <div className="m-3 grid min-h-[360px] place-items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 text-center">
src/components/dashboard-builder/dashboard-builder.tsx:309:          <div className="max-w-sm">
src/components/dashboard-builder/dashboard-builder.tsx:310:            <h2 className="text-base font-semibold text-slate-950">No hay widgets visibles</h2>
src/components/dashboard-builder/dashboard-builder.tsx:312:              Activa widgets desde Opciones o restaura el layout por defecto.
src/components/dashboard-builder/dashboard-builder.tsx:322:              <RotateCcw className="h-3.5 w-3.5" />
src/components/dashboard-builder/dashboard-builder.tsx:323:              Restaurar widgets
src/components/dashboard-builder/dashboard-builder.tsx:328:        <ResponsiveGridLayout
src/components/dashboard-builder/dashboard-builder.tsx:329:          width={gridWidth}
src/components/dashboard-builder/dashboard-builder.tsx:330:          className="dashboard-builder-grid p-3"
src/components/dashboard-builder/dashboard-builder.tsx:331:          layouts={layouts}
src/components/dashboard-builder/dashboard-builder.tsx:339:            handle: ".dashboard-widget-drag-grip",
src/components/dashboard-builder/dashboard-builder.tsx:343:          resizeConfig={{
src/components/dashboard-builder/dashboard-builder.tsx:350:            const widget = widgetById.get(preference.widgetId);
src/components/dashboard-builder/dashboard-builder.tsx:351:            const definition = getDashboardWidgetDefinition(preference.widgetId);
src/components/dashboard-builder/dashboard-builder.tsx:352:            if (!widget) return null;
src/components/dashboard-builder/dashboard-builder.tsx:355:              <div key={preference.widgetId} className="relative min-h-0 pl-6">
src/components/dashboard-builder/dashboard-builder.tsx:358:                  className="dashboard-widget-drag-grip absolute left-0 top-4 z-10 hidden cursor-grab place-items-center rounded-md text-slate-300 transition hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing sm:grid"
src/components/dashboard-builder/dashboard-builder.tsx:359:                  aria-label={`Mover ${definition?.title || preference.widgetId}`}
src/components/dashboard-builder/dashboard-builder.tsx:361:                  <GripVertical className="h-4 w-4" />
src/components/dashboard-builder/dashboard-builder.tsx:364:                <DashboardGridItemShell>
src/components/dashboard-builder/dashboard-builder.tsx:365:                  {widget.render
src/components/dashboard-builder/dashboard-builder.tsx:366:                    ? widget.render({ mode: preference.mode, settings: preference.settings })
src/components/dashboard-builder/dashboard-builder.tsx:367:                    : widget.content}
src/components/dashboard-builder/dashboard-builder.tsx:368:                </DashboardGridItemShell>
src/components/dashboard-builder/dashboard-builder.tsx:372:        </ResponsiveGridLayout>
src/components/dashboard-builder/types.ts:8:export type DashboardGridLayoutItem = {
src/components/dashboard-builder/types.ts:24:  widgetId: string;
src/components/dashboard-builder/types.ts:27:  layout: Partial<Record<DashboardBreakpoint, DashboardGridLayoutItem>>;
src/components/dashboard-builder/types.ts:51:  defaultLayout: Partial<Record<DashboardBreakpoint, DashboardGridLayoutItem>>;
src/components/dashboard-builder/index.ts:3:  DashboardGridLayoutItem,
src/components/dashboard-builder/index.ts:18:} from "./widget-registry";
src/components/dashboard-builder/index.ts:20:export { useDashboardLayout } from "./use-dashboard-layout";
src/components/dashboard-builder/widget-registry.ts:20:  DashboardGridLayoutItem,
src/components/dashboard-builder/widget-registry.ts:28:function layout(
src/components/dashboard-builder/widget-registry.ts:30:  lg: Omit<DashboardGridLayoutItem, "i">,
src/components/dashboard-builder/widget-registry.ts:31:  md?: Omit<DashboardGridLayoutItem, "i">,
src/components/dashboard-builder/widget-registry.ts:32:  sm?: Omit<DashboardGridLayoutItem, "i">,
src/components/dashboard-builder/widget-registry.ts:33:  xs?: Omit<DashboardGridLayoutItem, "i">,
src/components/dashboard-builder/widget-registry.ts:53:    defaultLayout: layout("agent.autopilot", {
src/components/dashboard-builder/widget-registry.ts:71:    defaultLayout: layout("sales.pipeline-summary", {
src/components/dashboard-builder/widget-registry.ts:89:    defaultLayout: layout("finance.documents-overview", {
src/components/dashboard-builder/widget-registry.ts:107:    defaultLayout: layout("work.center", { x: 0, y: 19, w: 8, h: 5, minW: 5, minH: 4 }),
src/components/dashboard-builder/widget-registry.ts:118:    defaultLayout: layout("personal.todo-items", { x: 8, y: 19, w: 4, h: 5, minW: 3, minH: 4 }),
src/components/dashboard-builder/widget-registry.ts:129:    defaultLayout: layout("leads.attention", { x: 6, y: 0, w: 3, h: 4, minW: 3, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts:140:    defaultLayout: layout("tasks.my-work", { x: 0, y: 1, w: 8, h: 5, minW: 4, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts:151:    defaultLayout: layout("projects.risk", { x: 0, y: 4, w: 4, h: 4, minW: 3, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts:162:    defaultLayout: layout("invoices.collections", { x: 4, y: 4, w: 4, h: 4, minW: 3, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts:173:    defaultLayout: layout("proposals.pending", { x: 8, y: 4, w: 4, h: 4, minW: 3, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts:184:    defaultLayout: layout("inbox.pending", { x: 8, y: 6, w: 4, h: 4, minW: 3, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts:195:    defaultLayout: layout("calendar.agenda", { x: 8, y: 1, w: 4, h: 5, minW: 3, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts:206:    defaultLayout: layout("clients.review", { x: 4, y: 6, w: 4, h: 4, minW: 3, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts:217:    defaultLayout: layout("tickets.status", { x: 8, y: 8, w: 2, h: 3, minW: 2, minH: 2 }),
src/components/dashboard-builder/widget-registry.ts:228:    defaultLayout: layout("activity.recent", { x: 0, y: 10, w: 4, h: 4, minW: 3, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts:239:    defaultLayout: layout("reports.revenue-snapshot", {
src/components/dashboard-builder/widget-registry.ts:257:    defaultLayout: layout("goals.progress", { x: 6, y: 12, w: 3, h: 3, minW: 2, minH: 2 }),
src/components/dashboard-builder/widget-registry.ts:268:    defaultLayout: layout("sales.quick-kpis", { x: 0, y: 0, w: 3, h: 1, minW: 2, minH: 1 }),
src/components/dashboard-builder/widget-registry.ts:274:    widgetId: "agent.autopilot",
src/components/dashboard-builder/widget-registry.ts:277:    layout: layout("agent.autopilot", { x: 0, y: 24, w: 12, h: 5, minW: 6, minH: 4 }),
src/components/dashboard-builder/widget-registry.ts:281:    widgetId: "sales.quick-kpis",
src/components/dashboard-builder/widget-registry.ts:284:    layout: layout("sales.quick-kpis", { x: 0, y: 0, w: 3, h: 1, minW: 2, minH: 1 }),
src/components/dashboard-builder/widget-registry.ts:288:    widgetId: "leads.attention",
src/components/dashboard-builder/widget-registry.ts:291:    layout: layout("leads.attention", { x: 3, y: 0, w: 3, h: 1, minW: 2, minH: 1 }),
src/components/dashboard-builder/widget-registry.ts:295:    widgetId: "invoices.collections",
src/components/dashboard-builder/widget-registry.ts:298:    layout: layout("invoices.collections", { x: 6, y: 0, w: 3, h: 1, minW: 2, minH: 1 }),
src/components/dashboard-builder/widget-registry.ts:302:    widgetId: "proposals.pending",
src/components/dashboard-builder/widget-registry.ts:305:    layout: layout("proposals.pending", { x: 9, y: 0, w: 3, h: 1, minW: 2, minH: 1 }),
src/components/dashboard-builder/widget-registry.ts:309:    widgetId: "tasks.my-work",
src/components/dashboard-builder/widget-registry.ts:312:    layout: layout("tasks.my-work", { x: 0, y: 1, w: 8, h: 5, minW: 4, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts:316:    widgetId: "calendar.agenda",
src/components/dashboard-builder/widget-registry.ts:319:    layout: layout("calendar.agenda", { x: 8, y: 1, w: 4, h: 5, minW: 3, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts:323:    widgetId: "sales.pipeline-summary",
src/components/dashboard-builder/widget-registry.ts:326:    layout: layout("sales.pipeline-summary", { x: 0, y: 6, w: 4, h: 4, minW: 3, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts:330:    widgetId: "inbox.pending",
src/components/dashboard-builder/widget-registry.ts:333:    layout: layout("inbox.pending", { x: 4, y: 6, w: 4, h: 4, minW: 3, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts:337:    widgetId: "clients.review",
src/components/dashboard-builder/widget-registry.ts:340:    layout: layout("clients.review", { x: 8, y: 6, w: 4, h: 4, minW: 3, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts:344:    widgetId: "activity.recent",
src/components/dashboard-builder/widget-registry.ts:347:    layout: layout("activity.recent", { x: 0, y: 10, w: 4, h: 4, minW: 3, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts:351:    widgetId: "reports.revenue-snapshot",
src/components/dashboard-builder/widget-registry.ts:354:    layout: layout("reports.revenue-snapshot", { x: 4, y: 10, w: 4, h: 4, minW: 3, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts:358:    widgetId: "projects.risk",
src/components/dashboard-builder/widget-registry.ts:361:    layout: layout("projects.risk", { x: 8, y: 10, w: 4, h: 4, minW: 3, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts:365:    widgetId: "finance.documents-overview",
src/components/dashboard-builder/widget-registry.ts:368:    layout: layout("finance.documents-overview", { x: 0, y: 14, w: 8, h: 5, minW: 5, minH: 4 }),
src/components/dashboard-builder/widget-registry.ts:372:    widgetId: "personal.todo-items",
src/components/dashboard-builder/widget-registry.ts:375:    layout: layout("personal.todo-items", { x: 8, y: 14, w: 4, h: 5, minW: 3, minH: 4 }),
src/components/dashboard-builder/widget-registry.ts:379:    widgetId: "work.center",
src/components/dashboard-builder/widget-registry.ts:382:    layout: layout("work.center", { x: 0, y: 19, w: 8, h: 5, minW: 5, minH: 4 }),
src/components/dashboard-builder/widget-registry.ts:388:  dashboardDefaultPreset.map((preference) => [preference.widgetId, preference]),
src/components/dashboard-builder/widget-registry.ts:391:export function getDashboardWidgetDefinition(widgetId: string) {
src/components/dashboard-builder/widget-registry.ts:392:  return dashboardWidgetRegistry.find((widget) => widget.id === widgetId) || null;
src/components/dashboard-builder/widget-registry.ts:396:  return dashboardWidgetRegistry.map((widget) => {
src/components/dashboard-builder/widget-registry.ts:397:    const preset = dashboardDefaultPresetById.get(widget.id);
src/components/dashboard-builder/widget-registry.ts:400:      widgetId: widget.id,
src/components/dashboard-builder/widget-registry.ts:402:      mode: preset?.mode ?? widget.defaultMode,
src/components/dashboard-builder/widget-registry.ts:403:      layout: preset?.layout ?? widget.defaultLayout,
src/components/dashboard-builder/widget-registry.ts:413:        .filter((widget) => widget.enabled)
src/components/dashboard-builder/widget-registry.ts:414:        .map((widget) => widget.layout[breakpoint])
src/components/dashboard-builder/widget-registry.ts:415:        .filter(Boolean) as DashboardGridLayoutItem[];
src/components/dashboard-builder/widget-registry.ts:418:    {} as Record<DashboardBreakpoint, DashboardGridLayoutItem[]>,
src/components/dashboard-builder/widget-registry.ts:425:  const byId = new Map((preferences || []).map((preference) => [preference.widgetId, preference]));
src/components/dashboard-builder/widget-registry.ts:427:  return dashboardWidgetRegistry.map((widget) => {
src/components/dashboard-builder/widget-registry.ts:428:    const stored = byId.get(widget.id);
src/components/dashboard-builder/widget-registry.ts:429:    const preset = dashboardDefaultPresetById.get(widget.id);
src/components/dashboard-builder/widget-registry.ts:430:    const nextMode = (stored?.mode || preset?.mode || widget.defaultMode) as DashboardWidgetMode;
src/components/dashboard-builder/widget-registry.ts:433:      widgetId: widget.id,
src/components/dashboard-builder/widget-registry.ts:435:      mode: widget.supportedModes.includes(nextMode) ? nextMode : widget.defaultMode,
src/components/dashboard-builder/widget-registry.ts:436:      layout: {
src/components/dashboard-builder/widget-registry.ts:437:        ...(preset?.layout || widget.defaultLayout),
src/components/dashboard-builder/widget-registry.ts:438:        ...(stored?.layout || {}),
src/components/dashboard-builder/use-dashboard-layout.ts:11:} from "./widget-registry";
src/components/dashboard-builder/use-dashboard-layout.ts:74:        .from("dashboard_layouts")
src/components/dashboard-builder/use-dashboard-layout.ts:75:        .select("widgets")
src/components/dashboard-builder/use-dashboard-layout.ts:89:      const remotePreferences = Array.isArray(data?.widgets)
src/components/dashboard-builder/use-dashboard-layout.ts:90:        ? (data.widgets as DashboardWidgetPreference[])
src/components/dashboard-builder/use-dashboard-layout.ts:117:      const { error: saveError } = await (supabase as any).from("dashboard_layouts").upsert(
src/components/dashboard-builder/use-dashboard-layout.ts:121:          widgets: normalized,
src/components/contracts/contract-editor-dialog.tsx:146:      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
src/components/contracts/contract-editor-dialog.tsx:152:          <div className="grid gap-4 sm:grid-cols-2">
src/components/contracts/contract-editor-dialog.tsx:153:            <div className="space-y-1.5 sm:col-span-2"><Label>Subject</Label><Input value={form.subject} onChange={(event) => setField("subject", event.target.value)} required /></div>
src/components/contracts/contract-editor-dialog.tsx:163:            <div className="space-y-1.5 sm:col-span-2"><Label>Description / Terms</Label><Textarea rows={4} value={form.description} onChange={(event) => setField("description", event.target.value)} /></div>
src/components/contracts/contract-detail-dialog.tsx:141:      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto p-0">
src/components/contracts/contract-detail-dialog.tsx:152:            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
src/components/contracts/contract-detail-dialog.tsx:159:            {can("contracts.edit") && <form onSubmit={addDocument} className="rounded-xl border bg-slate-50 p-4"><div className="grid gap-3 md:grid-cols-[1fr_1.4fr_0.7fr]"><div className="space-y-1.5"><Label>Document Name</Label><Input value={docForm.file_name} onChange={(e) => setDocForm((f) => ({ ...f, file_name: e.target.value }))} placeholder="Signed contract PDF" /></div><div className="space-y-1.5"><Label>Document URL</Label><Input value={docForm.file_url} onChange={(e) => setDocForm((f) => ({ ...f, file_url: e.target.value }))} placeholder="https://..." /></div><div className="space-y-1.5"><Label>Type</Label><Input value={docForm.file_type} onChange={(e) => setDocForm((f) => ({ ...f, file_type: e.target.value }))} placeholder="PDF" /></div></div><div className="mt-3 flex justify-end"><Button type="submit" disabled={saving}><Plus className="mr-2 h-4 w-4" />{saving ? "Saving..." : "Add Document"}</Button></div></form>}
src/components/contracts/contract-detail-dialog.tsx:160:            <div className="rounded-xl border bg-white"><div className="flex items-center justify-between border-b p-3"><div className="font-extrabold text-slate-900">Documents</div><Button variant="outline" size="sm" onClick={() => void loadDetail()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div><div className="divide-y">{documents.length ? documents.map((doc) => <div key={doc.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-2 font-semibold text-slate-900"><FileText className="h-4 w-4" />{doc.file_name}</div><div className="mt-1 text-xs font-medium text-slate-500">{doc.file_type || "Document"} · {formatDate(doc.created_at)}</div></div><a href={doc.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50"><ExternalLink className="mr-2 h-4 w-4" />Open</a></div>) : <EmptyLine icon={<LinkIcon className="h-5 w-5" />} text="No hay documentos todavía." />}</div></div>
src/components/contracts/contract-detail-dialog.tsx:163:          <TabsContent value="activity" className="mt-0"><div className="rounded-xl border bg-white"><div className="flex items-center justify-between border-b p-3"><div className="font-extrabold text-slate-900">Activity Timeline</div>{loading ? <span className="text-xs font-bold text-slate-500">Loading...</span> : null}</div><div className="divide-y">{activity.length ? activity.map((event) => <div key={event.id} className="flex gap-3 p-3"><div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border bg-slate-50"><Clock3 className="h-4 w-4 text-slate-500" /></div><div><div className="font-semibold text-slate-900">{event.action.replace(/_/g, " ")}</div><div className="mt-1 text-sm text-slate-600">{event.detail || "No detail"}</div><div className="mt-1 text-xs font-bold text-slate-400">{formatDate(event.created_at)}</div></div></div>) : <EmptyLine icon={<Clock3 className="h-5 w-5" />} text="No hay actividad registrada todavía." />}</div></div></TabsContent>
src/components/projects/project-contracts-panel.tsx:72:      <div className="grid gap-3 sm:grid-cols-3">
src/components/projects/project-contracts-panel.tsx:78:      <div className="rounded-xl border bg-white p-4 shadow-sm">
src/components/projects/project-contracts-panel.tsx:81:          <div className="flex gap-2"><Button variant="outline" onClick={() => void loadContracts()}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button>{can("contracts.create") && <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Nuevo contrato</Button>}</div>
src/components/projects/project-contracts-panel.tsx:83:        <div className="overflow-hidden rounded-xl border"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Asunto</TableHead><TableHead>Tipo</TableHead><TableHead>Valor</TableHead><TableHead>Inicio</TableHead><TableHead>Fin</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader><TableBody>{contracts.length ? contracts.map((contract) => <TableRow key={contract.id}><TableCell className="font-semibold text-slate-500">{contract.contract_number || "—"}</TableCell><TableCell><div className="font-semibold text-slate-900">{contract.subject}</div><div className="line-clamp-1 text-xs text-slate-500">{contract.description || "Sin descripción"}</div></TableCell><TableCell>{contract.contract_type || "—"}</TableCell><TableCell className="font-semibold">{formatMoney(contract.contract_value)}</TableCell><TableCell>{formatDate(contract.start_date)}</TableCell><TableCell>{formatDate(contract.end_date)}</TableCell><TableCell><StatusBadge status={contract.status} /></TableCell></TableRow>) : <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-slate-500"><FileText className="mx-auto mb-2 h-5 w-5" />Este proyecto todavía no tiene contratos.</TableCell></TableRow>}</TableBody></Table></div></div>
src/components/projects/InlineProjectTaskCreator.tsx:233:            <div className="min-w-0">
src/components/projects/InlineProjectTaskCreator.tsx:250:        className="rounded-xl border bg-background/70 p-3 shadow-sm"
src/components/projects/InlineProjectTaskCreator.tsx:258:            <Plus className="h-4 w-4" /> Nueva tarea
src/components/projects/InlineProjectTaskCreator.tsx:262:            className="grid h-8 w-8 place-items-center rounded-lg border bg-background text-muted-foreground hover:bg-muted"
src/components/projects/InlineProjectTaskCreator.tsx:267:            <X className="h-4 w-4" />
src/components/projects/InlineProjectTaskCreator.tsx:277:            className="h-9"
src/components/projects/InlineProjectTaskCreator.tsx:284:            className="min-h-[62px]"
src/components/projects/InlineProjectTaskCreator.tsx:286:          <div className="grid grid-cols-2 gap-2">
src/components/projects/InlineProjectTaskCreator.tsx:291:              className="h-9"
src/components/projects/InlineProjectTaskCreator.tsx:297:              <SelectTrigger className="h-9">
src/components/projects/InlineProjectTaskCreator.tsx:314:              <Save className="h-3.5 w-3.5" /> {saving ? "Guardando..." : "Guardar y seguir"}
src/components/projects/project-tickets-panel.tsx:182:            <RefreshCw className="mr-2 h-4 w-4" />
src/components/projects/project-tickets-panel.tsx:187:              <ExternalLink className="mr-2 h-4 w-4" />
src/components/projects/project-tickets-panel.tsx:192:            <Plus className="mr-2 h-4 w-4" />
src/components/projects/project-tickets-panel.tsx:198:      <div className="overflow-hidden rounded-xl border bg-white">
src/components/projects/project-tickets-panel.tsx:199:        <div className="overflow-x-auto">
src/components/projects/project-tickets-panel.tsx:203:                <TableHead className="w-16">#</TableHead>
src/components/projects/project-tickets-panel.tsx:204:                <TableHead className="min-w-[280px]">Asunto</TableHead>
src/components/projects/project-tickets-panel.tsx:237:                    <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-center">
src/components/projects/project-tickets-panel.tsx:238:                      <div className="grid h-10 w-10 place-items-center rounded-xl border bg-slate-50 text-slate-500">
src/components/projects/project-tickets-panel.tsx:239:                        <Ticket className="h-5 w-5" />
src/components/projects/project-tickets-panel.tsx:258:        <DialogContent className="max-w-xl">
src/components/projects/project-tickets-panel.tsx:279:            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
src/components/projects/project-tickets-panel.tsx:280:              <div className="space-y-1.5 sm:col-span-1">
src/components/projects/project-tickets-panel.tsx:289:              <div className="space-y-1.5 sm:col-span-1">
src/components/projects/project-tickets-panel.tsx:296:              <div className="space-y-1.5 sm:col-span-1">
src/components/dashboard-v2/dashboard-kpi-card.tsx:28:    <article className="flex h-[74px] min-w-0 items-center gap-2.5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white px-3 py-2 shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
src/components/dashboard-v2/dashboard-kpi-card.tsx:31:          "grid h-9 w-9 shrink-0 place-items-center rounded-xl border",
src/components/dashboard-v2/dashboard-kpi-card.tsx:35:        <Icon className="h-3.5 w-3.5" />
src/components/dashboard-v2/dashboard-kpi-card.tsx:38:      <div className="min-w-0">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:19:import { DashboardCard, DashboardTextButton } from "./dashboard-card";
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:20:import { DashboardKpiCard } from "./dashboard-kpi-card";
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:254:      className="mt-1 grid h-7 w-full place-items-center rounded-lg text-[11px] font-medium text-blue-600 hover:bg-blue-50"
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:275:    <div className="grid min-h-0 gap-2.5 p-3 xl:h-[calc(100svh-64px)] xl:grid-rows-[74px_minmax(0,1fr)_minmax(0,0.68fr)] xl:overflow-hidden xl:p-3">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:276:      <section className="grid min-h-0 gap-2.5 md:grid-cols-2 xl:grid-cols-6">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:280:      </section>
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:282:      <section className="grid min-h-0 gap-2.5 xl:grid-cols-[minmax(0,1.78fr)_minmax(292px,.68fr)]">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:283:        <DashboardCard
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:286:          className="xl:min-h-0"
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:288:          <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:292:            <div className="min-h-0 overflow-hidden">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:293:              <div className="grid grid-cols-[minmax(210px,1.3fr)_minmax(116px,.68fr)_minmax(104px,.58fr)_74px_116px] border-b border-slate-200 bg-slate-50 px-4 py-1.5 text-[10.5px] font-medium text-slate-500">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:307:                    className="grid grid-cols-[minmax(210px,1.3fr)_minmax(116px,.68fr)_minmax(104px,.58fr)_74px_116px] items-center gap-2 border-b border-slate-200 px-4 py-1.5 text-[11.5px]"
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:309:                    <div className="flex min-w-0 items-center gap-3">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:310:                      <span className="h-3 w-3 shrink-0 rounded border border-slate-300" />
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:312:                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border ${softIcon(item.tone)}`}
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:314:                        <Icon className="h-3 w-3" />
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:332:                      className={`w-fit rounded-lg px-2 py-0.5 text-[10.5px] font-medium ${priorityClass(
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:344:                      className="h-7 rounded-lg border border-blue-200 px-2.5 text-[11px] font-medium text-slate-700 hover:bg-blue-50"
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:357:        </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:359:        <div className="min-h-0">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:360:          <DashboardCard
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:363:            className="h-full"
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:365:            <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] px-4 py-2">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:366:              <div className="min-h-0 overflow-hidden">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:374:                    className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-2 border-t border-slate-200 py-1.5"
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:377:                      className={`w-fit rounded-lg px-2 py-0.5 text-[10.5px] font-semibold ${
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:392:                    <span className="min-w-0">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:393:                      <span className="flex min-w-0 items-center gap-1.5">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:395:                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${toneDot(String(tone))}`}
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:413:          </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:415:      </section>
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:417:      <section className="grid min-h-0 gap-2.5 xl:grid-cols-[1.05fr_.95fr_1.05fr]">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:418:        <DashboardCard
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:421:          bodyClassName="h-full p-3"
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:423:          <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-2">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:424:            <div className="grid min-h-0 gap-3 overflow-hidden md:grid-cols-[1.15fr_.85fr]">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:425:              <div className="min-h-0 overflow-hidden">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:439:                        className="grid grid-cols-[72px_1fr_20px_52px] items-center gap-2 text-[10.8px]"
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:442:                        <span className="h-4 overflow-hidden rounded bg-slate-100">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:443:                          <i className={`block h-full ${color}`} style={{ width: `${percent}%` }} />
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:452:              <div className="min-h-0 overflow-hidden border-t border-slate-200 pt-2 md:border-l md:border-t-0 md:pl-3 md:pt-0">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:468:                        className="grid grid-cols-[62px_60px_1fr_28px] items-center gap-2 text-[10.5px]"
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:472:                        <span className="h-1.5 overflow-hidden rounded-full bg-slate-200">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:473:                          <i className={`block h-full ${color}`} style={{ width: percent }} />
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:488:        </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:490:        <DashboardCard
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:493:          bodyClassName="h-full p-3"
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:495:          <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto]">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:496:            <div className="min-h-0 space-y-1.5 overflow-hidden">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:502:                    className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-2 border-b border-slate-200 py-1 last:border-0"
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:505:                      className={`grid h-6 w-6 place-items-center rounded-lg text-[9.5px] font-semibold text-white ${
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:515:                    <span className="min-w-0">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:538:        </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:540:        <DashboardCard
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:543:          bodyClassName="h-full p-3"
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:545:          <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto]">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:546:            <div className="min-h-0 space-y-1 overflow-hidden">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:548:                <div className="grid h-full place-items-center rounded-xl bg-slate-50 px-4 text-center">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:569:                      className="grid w-full grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2 border-b border-slate-200 py-1.5 text-left last:border-0 hover:bg-slate-50"
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:572:                        className={`grid h-8 w-8 place-items-center rounded-full border ${
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:584:                        <ChannelIcon className="h-3.5 w-3.5" />
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:587:                      <span className="min-w-0">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:588:                        <span className="flex min-w-0 items-center gap-1.5">
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:617:              className="mt-1 grid h-7 w-full place-items-center rounded-lg text-[11px] font-medium text-blue-600 hover:bg-blue-50"
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:622:        </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:623:      </section>
src/components/dashboard-v2/dashboard-v2.tsx:24:import { DashboardCard, DashboardTextButton } from "./dashboard-card";
src/components/dashboard-v2/dashboard-v2.tsx:25:import { DashboardKpiCard } from "./dashboard-kpi-card";
src/components/dashboard-v2/dashboard-v2.tsx:294:  ["Sin datos", "Conecta datos para ver este widget.", "Pendiente", "neutral", "/dashboard"],
src/components/dashboard-v2/dashboard-v2.tsx:319:    <DashboardCard bodyClassName="p-3">
src/components/dashboard-v2/dashboard-v2.tsx:320:      <div className="flex h-full min-h-0 items-center gap-3">
src/components/dashboard-v2/dashboard-v2.tsx:322:          className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border ${softIcon(tone)}`}
src/components/dashboard-v2/dashboard-v2.tsx:324:          <Icon className="h-4 w-4" />
src/components/dashboard-v2/dashboard-v2.tsx:327:        <span className="min-w-0 flex-1">
src/components/dashboard-v2/dashboard-v2.tsx:328:          <span className="flex min-w-0 items-center justify-between gap-2">
src/components/dashboard-v2/dashboard-v2.tsx:350:    </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx:375:    <section
src/components/dashboard-v2/dashboard-v2.tsx:378:          ? "grid min-h-0 gap-2.5 md:grid-cols-2 xl:grid-cols-3"
src/components/dashboard-v2/dashboard-v2.tsx:379:          : "grid min-h-0 gap-2.5 md:grid-cols-2 xl:grid-cols-6"
src/components/dashboard-v2/dashboard-v2.tsx:385:    </section>
src/components/dashboard-v2/dashboard-v2.tsx:398:      className="mt-1 grid h-7 w-full place-items-center rounded-lg text-[11px] font-medium text-blue-600 hover:bg-blue-50"
src/components/dashboard-v2/dashboard-v2.tsx:464:    <DashboardCard
src/components/dashboard-v2/dashboard-v2.tsx:467:      bodyClassName="h-full p-3"
src/components/dashboard-v2/dashboard-v2.tsx:469:      <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]">
src/components/dashboard-v2/dashboard-v2.tsx:470:        <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
src/components/dashboard-v2/dashboard-v2.tsx:471:          <span className="min-w-0">
src/components/dashboard-v2/dashboard-v2.tsx:481:          <span className="grid grid-cols-3 gap-1 text-center">
src/components/dashboard-v2/dashboard-v2.tsx:503:        <div className="min-h-0 space-y-1.5 overflow-hidden">
src/components/dashboard-v2/dashboard-v2.tsx:505:            <div className="grid h-full place-items-center rounded-xl bg-slate-50 px-4 text-center">
src/components/dashboard-v2/dashboard-v2.tsx:516:                className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-transparent px-2 py-1.5 text-left hover:border-slate-200 hover:bg-white"
src/components/dashboard-v2/dashboard-v2.tsx:518:                <span className="flex min-w-0 items-center gap-2">
src/components/dashboard-v2/dashboard-v2.tsx:519:                  <i className={`h-2 w-2 shrink-0 rounded-full ${toneDot(itemTone)}`} />
src/components/dashboard-v2/dashboard-v2.tsx:520:                  <span className="min-w-0">
src/components/dashboard-v2/dashboard-v2.tsx:530:                  className={`max-w-[96px] truncate rounded-full px-2 py-0.5 text-[10px] font-semibold ${toneBadgeClass(
src/components/dashboard-v2/dashboard-v2.tsx:547:    </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx:595:    <DashboardCard
src/components/dashboard-v2/dashboard-v2.tsx:598:      bodyClassName="h-full p-3"
src/components/dashboard-v2/dashboard-v2.tsx:600:      <div className="grid h-full min-h-0 gap-2 md:grid-cols-2">
src/components/dashboard-v2/dashboard-v2.tsx:602:          <div key={label} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
src/components/dashboard-v2/dashboard-v2.tsx:617:    </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx:640:    <div className="min-w-0">
src/components/dashboard-v2/dashboard-v2.tsx:641:      <div className="mb-3 flex min-w-0 items-center gap-2">
src/components/dashboard-v2/dashboard-v2.tsx:642:        <Icon className="h-4 w-4 shrink-0 text-slate-500" />
src/components/dashboard-v2/dashboard-v2.tsx:654:            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
src/components/dashboard-v2/dashboard-v2.tsx:656:                className={`block h-full rounded-full ${progressColor(tone)}`}
src/components/dashboard-v2/dashboard-v2.tsx:696:    <DashboardCard
src/components/dashboard-v2/dashboard-v2.tsx:699:      bodyClassName="h-full p-4"
src/components/dashboard-v2/dashboard-v2.tsx:701:      <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-4">
src/components/dashboard-v2/dashboard-v2.tsx:702:        <div className="grid min-h-0 gap-5 overflow-hidden md:grid-cols-3">
src/components/dashboard-v2/dashboard-v2.tsx:720:        <div className="grid gap-2 border-t border-slate-200 pt-3 sm:grid-cols-3">
src/components/dashboard-v2/dashboard-v2.tsx:728:              className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left hover:bg-slate-50"
src/components/dashboard-v2/dashboard-v2.tsx:740:    </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx:782:    <DashboardCard bodyClassName="h-full p-0">
src/components/dashboard-v2/dashboard-v2.tsx:783:      <div className="grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)]">
src/components/dashboard-v2/dashboard-v2.tsx:784:        <div className="flex min-w-0 items-center gap-1 overflow-x-auto border-b border-slate-200 px-3 py-2">
src/components/dashboard-v2/dashboard-v2.tsx:790:              className={`flex h-8 shrink-0 items-center gap-1.5 border-b-2 px-2 text-[12px] font-semibold ${
src/components/dashboard-v2/dashboard-v2.tsx:796:              <Icon className="h-3.5 w-3.5" />
src/components/dashboard-v2/dashboard-v2.tsx:809:        <div className="min-h-0 overflow-hidden px-4 pb-3">
src/components/dashboard-v2/dashboard-v2.tsx:811:            <div className="grid h-full place-items-center rounded-xl bg-slate-50 text-center">
src/components/dashboard-v2/dashboard-v2.tsx:817:            <div className="overflow-hidden rounded-lg border border-slate-200">
src/components/dashboard-v2/dashboard-v2.tsx:818:              <div className="grid grid-cols-[36px_minmax(0,1fr)_92px_84px] bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500">
src/components/dashboard-v2/dashboard-v2.tsx:831:                  className="grid w-full grid-cols-[36px_minmax(0,1fr)_92px_84px] items-center gap-2 border-t border-slate-200 px-3 py-2 text-left hover:bg-slate-50"
src/components/dashboard-v2/dashboard-v2.tsx:834:                  <span className="min-w-0">
src/components/dashboard-v2/dashboard-v2.tsx:843:                    className={`w-fit max-w-[86px] truncate rounded-md px-2 py-0.5 text-[10.5px] font-semibold ${toneBadgeClass(
src/components/dashboard-v2/dashboard-v2.tsx:858:    </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx:885:    <DashboardCard
src/components/dashboard-v2/dashboard-v2.tsx:888:      bodyClassName="h-full p-4"
src/components/dashboard-v2/dashboard-v2.tsx:890:      <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
src/components/dashboard-v2/dashboard-v2.tsx:891:        <section className="min-h-0 overflow-hidden">
src/components/dashboard-v2/dashboard-v2.tsx:893:            <AlertTriangle className="h-3.5 w-3.5" />
src/components/dashboard-v2/dashboard-v2.tsx:909:                  className="grid w-full grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-slate-50"
src/components/dashboard-v2/dashboard-v2.tsx:911:                  <span className="h-3.5 w-3.5 rounded border border-slate-300" />
src/components/dashboard-v2/dashboard-v2.tsx:912:                  <span className="min-w-0">
src/components/dashboard-v2/dashboard-v2.tsx:920:                  <span className={`h-2 w-2 rounded-full ${toneDot(tone)}`} />
src/components/dashboard-v2/dashboard-v2.tsx:925:        </section>
src/components/dashboard-v2/dashboard-v2.tsx:927:        <section className="min-h-0 overflow-hidden">
src/components/dashboard-v2/dashboard-v2.tsx:929:            <CheckCircle2 className="h-3.5 w-3.5" />
src/components/dashboard-v2/dashboard-v2.tsx:945:                  className="grid w-full grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-slate-50"
src/components/dashboard-v2/dashboard-v2.tsx:947:                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
src/components/dashboard-v2/dashboard-v2.tsx:948:                  <span className="min-w-0">
src/components/dashboard-v2/dashboard-v2.tsx:956:                  <span className={`h-2 w-2 rounded-full ${toneDot(tone)}`} />
src/components/dashboard-v2/dashboard-v2.tsx:961:        </section>
src/components/dashboard-v2/dashboard-v2.tsx:963:    </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx:983:    <DashboardCard title={title} bodyClassName="h-full p-4">
src/components/dashboard-v2/dashboard-v2.tsx:984:      <div className="grid h-full place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center">
src/components/dashboard-v2/dashboard-v2.tsx:986:          <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500">
src/components/dashboard-v2/dashboard-v2.tsx:987:            <Icon className="h-4 w-4" />
src/components/dashboard-v2/dashboard-v2.tsx:993:    </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx:1021:    <DashboardCard
src/components/dashboard-v2/dashboard-v2.tsx:1024:      className="xl:min-h-0"
src/components/dashboard-v2/dashboard-v2.tsx:1026:      <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]">
src/components/dashboard-v2/dashboard-v2.tsx:1030:        <div className="min-h-0 overflow-hidden">
src/components/dashboard-v2/dashboard-v2.tsx:1031:          <div className="grid grid-cols-[minmax(210px,1.3fr)_minmax(116px,.68fr)_minmax(104px,.58fr)_74px_116px] border-b border-slate-200 bg-slate-50 px-4 py-1.5 text-[10.5px] font-medium text-slate-500">
src/components/dashboard-v2/dashboard-v2.tsx:1045:                className="grid grid-cols-[minmax(210px,1.3fr)_minmax(116px,.68fr)_minmax(104px,.58fr)_74px_116px] items-center gap-2 border-b border-slate-200 px-4 py-1.5 text-[11.5px]"
src/components/dashboard-v2/dashboard-v2.tsx:1047:                <div className="flex min-w-0 items-center gap-3">
src/components/dashboard-v2/dashboard-v2.tsx:1048:                  <span className="h-3 w-3 shrink-0 rounded border border-slate-300" />
src/components/dashboard-v2/dashboard-v2.tsx:1050:                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border ${softIcon(item.tone)}`}
src/components/dashboard-v2/dashboard-v2.tsx:1052:                    <Icon className="h-3 w-3" />
src/components/dashboard-v2/dashboard-v2.tsx:1070:                  className={`w-fit rounded-lg px-2 py-0.5 text-[10.5px] font-medium ${priorityClass(
src/components/dashboard-v2/dashboard-v2.tsx:1082:                  className="h-7 rounded-lg border border-blue-200 px-2.5 text-[11px] font-medium text-slate-700 hover:bg-blue-50"
src/components/dashboard-v2/dashboard-v2.tsx:1095:    </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx:1125:    <DashboardCard
src/components/dashboard-v2/dashboard-v2.tsx:1128:      className="h-full"
src/components/dashboard-v2/dashboard-v2.tsx:1130:      <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] px-4 py-2">
src/components/dashboard-v2/dashboard-v2.tsx:1131:        <div className="min-h-0 overflow-hidden">
src/components/dashboard-v2/dashboard-v2.tsx:1139:              className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-2 border-t border-slate-200 py-1.5"
src/components/dashboard-v2/dashboard-v2.tsx:1142:                className={`w-fit rounded-lg px-2 py-0.5 text-[10.5px] font-semibold ${
src/components/dashboard-v2/dashboard-v2.tsx:1157:              <span className="min-w-0">
src/components/dashboard-v2/dashboard-v2.tsx:1158:                <span className="flex min-w-0 items-center gap-1.5">
src/components/dashboard-v2/dashboard-v2.tsx:1159:                  <i className={`h-1.5 w-1.5 shrink-0 rounded-full ${toneDot(String(tone))}`} />
src/components/dashboard-v2/dashboard-v2.tsx:1176:    </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx:1210:    <DashboardCard
src/components/dashboard-v2/dashboard-v2.tsx:1213:      bodyClassName="h-full p-3"
src/components/dashboard-v2/dashboard-v2.tsx:1215:      <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-2">
src/components/dashboard-v2/dashboard-v2.tsx:1216:        <div className="grid min-h-0 gap-3 overflow-hidden md:grid-cols-[1.15fr_.85fr]">
src/components/dashboard-v2/dashboard-v2.tsx:1217:          <div className="min-h-0 overflow-hidden">
src/components/dashboard-v2/dashboard-v2.tsx:1229:                  className="grid grid-cols-[72px_1fr_20px_52px] items-center gap-2 text-[10.8px]"
src/components/dashboard-v2/dashboard-v2.tsx:1232:                  <span className="h-4 overflow-hidden rounded bg-slate-100">
src/components/dashboard-v2/dashboard-v2.tsx:1233:                    <i className={`block h-full ${color}`} style={{ width: `${percent}%` }} />
src/components/dashboard-v2/dashboard-v2.tsx:1242:          <div className="min-h-0 overflow-hidden border-t border-slate-200 pt-2 md:border-l md:border-t-0 md:pl-3 md:pt-0">
src/components/dashboard-v2/dashboard-v2.tsx:1258:                    className="grid grid-cols-[62px_60px_1fr_28px] items-center gap-2 text-[10.5px]"
src/components/dashboard-v2/dashboard-v2.tsx:1262:                    <span className="h-1.5 overflow-hidden rounded-full bg-slate-200">
src/components/dashboard-v2/dashboard-v2.tsx:1263:                      <i className={`block h-full ${color}`} style={{ width: percent }} />
src/components/dashboard-v2/dashboard-v2.tsx:1278:    </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx:1308:    <DashboardCard
src/components/dashboard-v2/dashboard-v2.tsx:1311:      bodyClassName="h-full p-3"
src/components/dashboard-v2/dashboard-v2.tsx:1313:      <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto]">
src/components/dashboard-v2/dashboard-v2.tsx:1314:        <div className="min-h-0 space-y-1.5 overflow-hidden">
src/components/dashboard-v2/dashboard-v2.tsx:1318:              className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-2 border-b border-slate-200 py-1 last:border-0"
src/components/dashboard-v2/dashboard-v2.tsx:1321:                className={`grid h-6 w-6 place-items-center rounded-lg text-[9.5px] font-semibold text-white ${
src/components/dashboard-v2/dashboard-v2.tsx:1331:              <span className="min-w-0">
src/components/dashboard-v2/dashboard-v2.tsx:1352:    </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx:1380:    <DashboardCard
src/components/dashboard-v2/dashboard-v2.tsx:1383:      bodyClassName="h-full p-3"
src/components/dashboard-v2/dashboard-v2.tsx:1385:      <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto]">
src/components/dashboard-v2/dashboard-v2.tsx:1386:        <div className="min-h-0 space-y-1 overflow-hidden">
src/components/dashboard-v2/dashboard-v2.tsx:1388:            <div className="grid h-full place-items-center rounded-xl bg-slate-50 px-4 text-center">
src/components/dashboard-v2/dashboard-v2.tsx:1411:                    className="grid w-full grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2 border-b border-slate-200 py-1.5 text-left last:border-0 hover:bg-slate-50"
src/components/dashboard-v2/dashboard-v2.tsx:1414:                      className={`grid h-8 w-8 place-items-center rounded-full border ${
src/components/dashboard-v2/dashboard-v2.tsx:1426:                      <ChannelIcon className="h-3.5 w-3.5" />
src/components/dashboard-v2/dashboard-v2.tsx:1429:                    <span className="min-w-0">
src/components/dashboard-v2/dashboard-v2.tsx:1430:                      <span className="flex min-w-0 items-center gap-1.5">
src/components/dashboard-v2/dashboard-v2.tsx:1459:          className="mt-1 grid h-7 w-full place-items-center rounded-lg text-[11px] font-medium text-blue-600 hover:bg-blue-50"
src/components/dashboard-v2/dashboard-v2.tsx:1464:    </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx:1492:    <DashboardCard
src/components/dashboard-v2/dashboard-v2.tsx:1495:      bodyClassName="h-full p-3"
src/components/dashboard-v2/dashboard-v2.tsx:1497:      <div className="min-h-0 space-y-1.5 overflow-hidden">
src/components/dashboard-v2/dashboard-v2.tsx:1501:            className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2 border-b border-slate-200 py-1.5 last:border-0"
src/components/dashboard-v2/dashboard-v2.tsx:1503:            <span className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
src/components/dashboard-v2/dashboard-v2.tsx:1504:              <Icon className="h-3.5 w-3.5" />
src/components/dashboard-v2/dashboard-v2.tsx:1506:            <span className="min-w-0">
src/components/dashboard-v2/dashboard-v2.tsx:1518:    </DashboardCard>
src/components/dashboard-v2/dashboard-v2.tsx:1551:      const widgetContractResult = await fetchAgentWidgetContract();
src/components/dashboard-v2/dashboard-v2.tsx:1553:      if (widgetContractResult.payload) {
src/components/dashboard-v2/dashboard-v2.tsx:1554:        setAgentPromptPayload(widgetContractResult.payload);
src/components/dashboard-v2/dashboard-v2.tsx:1559:        schema_version: "agent_widget_contract_v1",
src/components/dashboard-v2/dashboard-v2.tsx:1572:      console.error("Failed to refresh agent widget contract", error);
src/components/dashboard-v2/dashboard-v2.tsx:1575:        schema_version: "agent_widget_contract_v1",
src/components/dashboard-v2/dashboard-v2.tsx:1748:      widgets={[
src/components/dashboard-v2/dashboard-card.tsx:4:export function DashboardCard({
src/components/dashboard-v2/dashboard-card.tsx:18:    <section
src/components/dashboard-v2/dashboard-card.tsx:20:        "flex h-full min-h-0 flex-col overflow-hidden rounded-[18px] border border-slate-200/80 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.04)]",
src/components/dashboard-v2/dashboard-card.tsx:25:        <div className="flex min-h-10 items-center justify-between gap-3 border-b border-slate-200/80 px-4">
src/components/dashboard-v2/dashboard-card.tsx:37:      <div className={cn("min-h-0 flex-1 overflow-hidden", bodyClassName)}>{children}</div>
src/components/dashboard-v2/dashboard-card.tsx:38:    </section>
src/components/crm/quick-create-dialog.tsx:517:      <DialogContent className="max-w-lg">
src/components/crm/quick-create-dialog.tsx:520:            <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#eaf1ff] text-[#1d62f9]">
src/components/crm/quick-create-dialog.tsx:521:              <Icon className="h-5 w-5" />
src/components/crm/quick-create-dialog.tsx:542:              <div className="grid grid-cols-2 gap-4">
src/components/crm/quick-create-dialog.tsx:604:              <div className="grid grid-cols-2 gap-4">
src/components/crm/quick-create-dialog.tsx:647:              <div className="grid grid-cols-2 gap-4">
src/components/crm/quick-create-dialog.tsx:703:              <div className="grid grid-cols-3 gap-4">
src/components/crm/quick-create-dialog.tsx:753:                  <FileText className="mr-1 inline h-3.5 w-3.5" />
src/components/crm/quick-create-dialog.tsx:772:              <div className="grid grid-cols-2 gap-4">
src/components/crm/quick-create-dialog.tsx:812:                  <FileText className="mr-1 inline h-3.5 w-3.5" />
src/components/crm/metric-card.tsx:1:import { Card, CardContent } from "@/components/ui/card";
src/components/crm/metric-card.tsx:33:          "rounded-[22px] border border-[#e6eaf0] bg-white shadow-[0_8px_26px_rgba(15,23,42,0.05)]",
src/components/crm/metric-card.tsx:41:                compact ? "h-[34px] w-[34px] rounded-[12px]" : "h-[38px] w-[38px] rounded-[14px]",
src/components/crm/metric-card.tsx:42:                "grid place-items-center",
src/components/crm/metric-card.tsx:46:              <Icon className={cn("h-[18px] w-[18px]", iconClassName)} />
src/components/crm/metric-card.tsx:72:    <Card className={cn("border-border/40 shadow-sm bg-card", className)}>
src/components/crm/metric-card.tsx:75:          <Icon className={`h-4 w-4 ${iconClassName}`} />
src/components/crm/empty-state.tsx:15:      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground mb-4">
src/components/crm/empty-state.tsx:16:        {icon || <Inbox className="h-6 w-6" />}
src/components/crm/empty-state.tsx:19:      <p className="text-sm text-muted-foreground text-center max-w-sm mb-5">{description}</p>
src/components/crm/empty-state.tsx:22:          <Plus className="h-4 w-4" />
src/components/crm/crm-detail.tsx:17:    <section className={cn("space-y-2", className)}>
src/components/crm/crm-detail.tsx:19:        <div className="flex items-center gap-2 min-w-0">
src/components/crm/crm-detail.tsx:21:            <span className="grid h-6 w-6 place-items-center rounded-[9px] border bg-background/70 text-muted-foreground">
src/components/crm/crm-detail.tsx:31:      <div className="rounded-[14px] border bg-background p-4 shadow-[0_10px_26px_rgba(15,23,42,.04)]">
src/components/crm/crm-detail.tsx:34:    </section>
src/components/crm/crm-detail.tsx:50:      <div className="min-w-0 text-right text-[13px] font-medium text-foreground">{value}</div>
src/components/crm/activity-feed.tsx:31:            <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
src/components/crm/activity-feed.tsx:32:            <div className="flex-1 min-w-0">
src/components/crm/detail-sheet.tsx:49:  if (size === "lg") return "w-full sm:max-w-[640px]";
src/components/crm/detail-sheet.tsx:50:  return "w-full sm:max-w-[520px]";
src/components/crm/detail-sheet.tsx:98:            <div className={"pointer-events-none absolute inset-x-0 top-0 h-[84px] bg-gradient-to-b " + ACCENT_CLASS[accent]} />
src/components/crm/detail-sheet.tsx:100:              <div className="flex min-w-0 items-start gap-3">
src/components/crm/detail-sheet.tsx:101:                {icon ? <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border bg-background/85 shadow-[0_12px_24px_rgba(15,23,42,.06)]">{icon}</div> : null}
src/components/crm/detail-sheet.tsx:102:                <div className="min-w-0">
src/components/crm/detail-sheet.tsx:108:              <button type="button" onClick={handleClose} className="grid h-9 w-9 place-items-center rounded-[12px] border bg-background/90 text-muted-foreground shadow-[0_10px_22px_rgba(15,23,42,.06)] transition hover:-translate-y-[1px] hover:bg-background" aria-label={t("common.close")} title={t("common.close")}>
src/components/crm/detail-sheet.tsx:109:                <X className="h-4 w-4" />
src/components/crm/detail-sheet.tsx:113:              {actions ? actions : <>{onEdit ? <Button variant="outline" size="sm" onClick={onEdit} className="h-8 gap-1.5 text-xs"><Pencil className="h-3.5 w-3.5" /> {t("common.edit")}</Button> : null}{onDelete ? <Button variant="outline" size="sm" onClick={onDelete} className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /> {t("common.delete")}</Button> : null}</>}
src/components/crm/detail-sheet.tsx:118:        <ScrollArea className={hasHeaderContent ? "h-[calc(100vh-118px)]" : "h-screen"}>
src/components/crm/detail-sheet.tsx:121:              <div data-demo={fieldGroupDataDemo} className="grid grid-cols-2 gap-4">
src/components/crm/detail-sheet.tsx:123:                  <div key={field.label} className={field.type === "tags" ? "col-span-2" : ""}>
src/components/crm/loading-state.tsx:8:          <Skeleton key={i} className="h-4 flex-1" />
src/components/crm/loading-state.tsx:14:            <Skeleton key={j} className="h-8 flex-1" />
src/components/crm/loading-state.tsx:24:    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
src/components/crm/loading-state.tsx:26:        <Skeleton key={i} className="h-32 rounded-xl" />
src/components/crm/loading-state.tsx:34:    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
src/components/crm/loading-state.tsx:36:        <Skeleton key={i} className="h-20 rounded-xl" />
src/components/crm/data-card.tsx:1:import { Card, CardContent } from "@/components/ui/card";
src/components/crm/data-card.tsx:12:    <Card className={cn("border-border/40 shadow-sm bg-card", className)}>
src/components/crm/page-header.tsx:31:            {actionIcon || <Plus className="h-4 w-4" />}
src/components/crm/search-filters.tsx:48:      <div className="relative flex-1 min-w-[200px]">
src/components/crm/search-filters.tsx:49:        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
src/components/crm/search-filters.tsx:54:          className="pl-9 h-9 bg-muted/30 border-border/50 focus-visible:ring-1"
src/components/crm/search-filters.tsx:59:          <SelectTrigger className={`h-9 ${filter.width || "w-40"} bg-muted/30 border-border/50`}>
src/components/agent/AgentCommandWidget.tsx.bak-phase-a-20260705181335:186:      <path d="m13 2-2 7H4l5.5 3.5L7.5 20 13 15.5 18.5 20l-2-7.5L22 9h-7z" />
src/components/agent/AgentCommandWidget.tsx.bak-phase-a-20260705181335:283:    "agent-command-widget",
src/components/agent/AgentCommandWidget.tsx.bak-phase-a-20260705181335:376:    <section
src/components/agent/AgentCommandWidget.tsx.bak-phase-a-20260705181335:385:      <div className="agent-widget-top">
src/components/agent/AgentCommandWidget.tsx.bak-phase-a-20260705181335:416:      <div className="agent-review-mode">
src/components/agent/AgentCommandWidget.tsx.bak-phase-a-20260705181335:417:        <article className="agent-main-card">
src/components/agent/AgentCommandWidget.tsx.bak-phase-a-20260705181335:455:        <aside className="agent-plan-card">
src/components/agent/AgentCommandWidget.tsx.bak-phase-a-20260705181335:512:                Volver al widget
src/components/agent/AgentCommandWidget.tsx.bak-phase-a-20260705181335:521:    </section>
src/components/agent/agentPromptPayloadAdapter.ts.bak-phase-a-20260705181335:103:  widget_contract?: AgentWidgetContractV1;
src/components/agent/agentPromptPayloadAdapter.ts.bak-phase-a-20260705181335:104:  agent_widget_contract?: AgentWidgetContractV1;
src/components/agent/agentPromptPayloadAdapter.ts.bak-phase-a-20260705181335:347:  if (isAgentWidgetContractV1(payload.widget_contract)) {
src/components/agent/agentPromptPayloadAdapter.ts.bak-phase-a-20260705181335:348:    return payload.widget_contract.recovery_plans.map(normalizeWidgetContractRecoveryPlan);
src/components/agent/agentPromptPayloadAdapter.ts.bak-phase-a-20260705181335:351:  if (isAgentWidgetContractV1(payload.agent_widget_contract)) {
src/components/agent/agentPromptPayloadAdapter.ts.bak-phase-a-20260705181335:352:    return payload.agent_widget_contract.recovery_plans.map(normalizeWidgetContractRecoveryPlan);
src/components/agent/agentWidgetContract.ts:1:export const AGENT_WIDGET_CONTRACT_VERSION = "agent_widget_contract_v1" as const;
src/components/agent/agentPromptPayloadAdapter.ts:103:  widget_contract?: AgentWidgetContractV1;
src/components/agent/agentPromptPayloadAdapter.ts:104:  agent_widget_contract?: AgentWidgetContractV1;
src/components/agent/agentPromptPayloadAdapter.ts:357:  if (isAgentWidgetContractV1(payload.widget_contract)) {
src/components/agent/agentPromptPayloadAdapter.ts:358:    return payload.widget_contract.recovery_plans.map(normalizeWidgetContractRecoveryPlan);
src/components/agent/agentPromptPayloadAdapter.ts:361:  if (isAgentWidgetContractV1(payload.agent_widget_contract)) {
src/components/agent/agentPromptPayloadAdapter.ts:362:    return payload.agent_widget_contract.recovery_plans.map(normalizeWidgetContractRecoveryPlan);
src/components/agent/AgentCommandWidget.css:1:.agent-command-widget {
src/components/agent/AgentCommandWidget.css:12:.agent-command-widget * {
src/components/agent/AgentCommandWidget.css:16:.agent-widget-top {
src/components/agent/AgentCommandWidget.css:35:  line-height: 1.2;
src/components/agent/AgentCommandWidget.css:58:  height: 8px;
src/components/agent/AgentCommandWidget.css:136:.agent-review-mode {
src/components/agent/AgentCommandWidget.css:141:.agent-main-card,
src/components/agent/AgentCommandWidget.css:142:.agent-plan-card {
src/components/agent/AgentCommandWidget.css:148:.agent-main-card {
src/components/agent/AgentCommandWidget.css:149:  min-height: auto;
src/components/agent/AgentCommandWidget.css:152:.agent-main-card {
src/components/agent/AgentCommandWidget.css:158:.agent-main-card::after {
src/components/agent/AgentCommandWidget.css:181:  display: grid;
src/components/agent/AgentCommandWidget.css:182:  grid-template-columns: 56px 1fr;
src/components/agent/AgentCommandWidget.css:196:  height: 52px;
src/components/agent/AgentCommandWidget.css:198:  display: grid;
src/components/agent/AgentCommandWidget.css:206:  height: 25px;
src/components/agent/AgentCommandWidget.css:242:  line-height: 1.55;
src/components/agent/AgentCommandWidget.css:255:  line-height: 1.5;
src/components/agent/AgentCommandWidget.css:283:.agent-plan-card {
src/components/agent/AgentCommandWidget.css:309:  display: grid;
src/components/agent/AgentCommandWidget.css:315:  display: grid;
src/components/agent/AgentCommandWidget.css:316:  grid-template-columns: 28px 1fr;
src/components/agent/AgentCommandWidget.css:322:  height: 25px;
src/components/agent/AgentCommandWidget.css:324:  display: grid;
src/components/agent/AgentCommandWidget.css:341:  line-height: 1.42;
src/components/agent/AgentCommandWidget.css:344:.agent-command-widget.compact .agent-plan-card {
src/components/agent/AgentCommandWidget.css:348:.agent-command-widget.compact .agent-review-mode {
src/components/agent/AgentCommandWidget.css:352:.agent-command-widget.compact .agent-main-card {
src/components/agent/AgentCommandWidget.css:353:  min-height: auto;
src/components/agent/AgentCommandWidget.css:357:.agent-command-widget.compact .agent-event-shell {
src/components/agent/AgentCommandWidget.css:358:  grid-template-columns: 44px 1fr;
src/components/agent/AgentCommandWidget.css:362:.agent-command-widget.compact .agent-event-icon {
src/components/agent/AgentCommandWidget.css:364:  height: 42px;
src/components/agent/AgentCommandWidget.css:368:.agent-command-widget.compact .agent-event-title {
src/components/agent/AgentCommandWidget.css:372:.agent-command-widget.compact .agent-event-message {
src/components/agent/AgentCommandWidget.css:378:.agent-command-widget.compact .agent-action-row {
src/components/agent/AgentCommandWidget.css:387:.agent-command-widget.executing .agent-review-mode,
src/components/agent/AgentCommandWidget.css:388:.agent-command-widget.executing .agent-headline {
src/components/agent/AgentCommandWidget.css:392:.agent-command-widget.executing .agent-execution-mode {
src/components/agent/AgentCommandWidget.css:403:  min-height: 300px;
src/components/agent/AgentCommandWidget.css:415:  height: 36px;
src/components/agent/AgentCommandWidget.css:443:  line-height: 1.85;
src/components/agent/AgentCommandWidget.css:445:  min-height: 150px;
src/components/agent/AgentCommandWidget.css:473:  height: 16px;
src/components/agent/AgentCommandWidget.css:509:  line-height: 1.5;
src/components/agent/AgentCommandWidget.css:514:  display: grid;
src/components/agent/AgentCommandWidget.css:515:  grid-template-columns: repeat(3, minmax(0, 1fr));
src/components/agent/AgentCommandWidget.css:539:  .agent-widget-top {
src/components/agent/AgentCommandWidget.css:544:  .agent-review-mode {
src/components/agent/AgentCommandWidget.css:545:    grid-template-columns: 1fr;
src/components/agent/AgentCommandWidget.css:548:  .agent-plan-card,
src/components/agent/AgentCommandWidget.css:549:  .agent-main-card {
src/components/agent/AgentCommandWidget.css:550:    min-height: auto;
src/components/agent/AgentCommandWidget.css:554:    grid-template-columns: 1fr;
src/components/agent/AgentCommandWidget.tsx.bak-single-card-20260705182545:186:      <path d="m13 2-2 7H4l5.5 3.5L7.5 20 13 15.5 18.5 20l-2-7.5L22 9h-7z" />
src/components/agent/AgentCommandWidget.tsx.bak-single-card-20260705182545:283:    "agent-command-widget",
src/components/agent/AgentCommandWidget.tsx.bak-single-card-20260705182545:376:    <section
src/components/agent/AgentCommandWidget.tsx.bak-single-card-20260705182545:385:      <div className="agent-widget-top">
src/components/agent/AgentCommandWidget.tsx.bak-single-card-20260705182545:416:      <div className="agent-review-mode">
src/components/agent/AgentCommandWidget.tsx.bak-single-card-20260705182545:417:        <article className="agent-main-card">
src/components/agent/AgentCommandWidget.tsx.bak-single-card-20260705182545:455:        <aside className="agent-plan-card">
src/components/agent/AgentCommandWidget.tsx.bak-single-card-20260705182545:512:                Volver al widget
src/components/agent/AgentCommandWidget.tsx.bak-single-card-20260705182545:521:    </section>
src/components/agent/AgentCommandWidget.tsx:186:      <path d="m13 2-2 7H4l5.5 3.5L7.5 20 13 15.5 18.5 20l-2-7.5L22 9h-7z" />
src/components/agent/AgentCommandWidget.tsx:283:    "agent-command-widget",
src/components/agent/AgentCommandWidget.tsx:376:    <section
src/components/agent/AgentCommandWidget.tsx:385:      <div className="agent-widget-top">
src/components/agent/AgentCommandWidget.tsx:410:      <div className="agent-review-mode">
src/components/agent/AgentCommandWidget.tsx:411:        <article className="agent-main-card">
src/components/agent/AgentCommandWidget.tsx:481:                Volver al widget
src/components/agent/AgentCommandWidget.tsx:490:    </section>
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:1:.agent-command-widget {
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:12:.agent-command-widget * {
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:16:.agent-widget-top {
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:35:  line-height: 1.2;
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:58:  height: 8px;
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:136:.agent-review-mode {
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:138:  display: grid;
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:139:  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:143:.agent-main-card,
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:144:.agent-plan-card {
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:148:  min-height: 310px;
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:151:.agent-main-card {
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:157:.agent-main-card::after {
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:180:  display: grid;
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:181:  grid-template-columns: 56px 1fr;
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:195:  height: 52px;
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:197:  display: grid;
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:205:  height: 25px;
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:241:  line-height: 1.55;
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:254:  line-height: 1.5;
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:282:.agent-plan-card {
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:308:  display: grid;
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:314:  display: grid;
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:315:  grid-template-columns: 28px 1fr;
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:321:  height: 25px;
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:323:  display: grid;
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:340:  line-height: 1.42;
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:343:.agent-command-widget.compact .agent-headline,
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:344:.agent-command-widget.compact .agent-plan-card,
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:345:.agent-command-widget.compact .agent-promise,
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:346:.agent-command-widget.compact .agent-impact-row {
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:350:.agent-command-widget.compact .agent-review-mode {
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:354:.agent-command-widget.compact .agent-main-card {
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:355:  min-height: auto;
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:359:.agent-command-widget.compact .agent-event-shell {
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:360:  grid-template-columns: 44px 1fr;
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:364:.agent-command-widget.compact .agent-event-icon {
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:366:  height: 42px;
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:370:.agent-command-widget.compact .agent-event-title {
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:374:.agent-command-widget.compact .agent-event-message {
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:380:.agent-command-widget.compact .agent-action-row {
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:389:.agent-command-widget.executing .agent-review-mode,
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:390:.agent-command-widget.executing .agent-headline {
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:394:.agent-command-widget.executing .agent-execution-mode {
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:405:  min-height: 300px;
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:417:  height: 36px;
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:445:  line-height: 1.85;
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:447:  min-height: 150px;
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:475:  height: 16px;
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:511:  line-height: 1.5;
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:516:  display: grid;
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:517:  grid-template-columns: repeat(3, minmax(0, 1fr));
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:541:  .agent-widget-top {
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:546:  .agent-review-mode {
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:547:    grid-template-columns: 1fr;
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:550:  .agent-plan-card,
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:551:  .agent-main-card {
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:552:    min-height: auto;
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:556:    grid-template-columns: 1fr;
src/components/agent/agentWidgetContract.ts.bak-phase-a-20260705181335:1:export const AGENT_WIDGET_CONTRACT_VERSION = "agent_widget_contract_v1" as const;
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:312:    <div className="min-h-[calc(100vh-88px)] bg-[#f5f7fb] text-slate-950 print:bg-white">
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:322:      <div className="no-print sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/95 px-5 backdrop-blur">
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:330:            <Eye className="h-4 w-4" />
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:334:            <Printer className="h-4 w-4" />
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:338:            <Send className="h-4 w-4" />
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:344:      <div className="grid h-[calc(100vh-152px)] gap-5 p-5 xl:grid-cols-[minmax(820px,1fr)_minmax(300px,420px)] print:block print:h-auto print:p-0">
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:345:        <aside className="no-print flex min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:348:              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-600">
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:349:                <Sparkles className="h-5 w-5" />
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:360:              <Settings2 className="h-4 w-4" />
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:365:          <div className="grid gap-3 border-b bg-slate-50 p-4 md:grid-cols-[1.5fr_1fr_1fr_120px]">
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:366:            <label className="grid gap-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:368:              <select value={selectedClientId} onChange={(e) => applyClient(e.target.value)} className="h-11 rounded-2xl border bg-white px-3 text-sm font-semibold normal-case tracking-normal outline-none focus:border-blue-400">
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:374:            <label className="grid gap-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Email<input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="h-11 rounded-2xl border bg-white px-3 text-sm normal-case tracking-normal outline-none focus:border-blue-400" /></label>
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:375:            <label className="grid gap-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Teléfono<input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="h-11 rounded-2xl border bg-white px-3 text-sm normal-case tracking-normal outline-none focus:border-blue-400" /></label>
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:376:            <label className="grid gap-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Factura<input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="h-11 rounded-2xl border bg-white px-3 text-sm font-bold normal-case tracking-normal outline-none focus:border-blue-400" /></label>
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:379:          <div className="min-h-0 flex-1 overflow-hidden p-4">
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:382:              <button type="button" onClick={addItem} className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"><Plus className="h-3.5 w-3.5" />Agregar línea</button>
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:385:            <div className="flex max-h-full flex-col overflow-hidden rounded-2xl border border-slate-200">
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:386:              <div className="grid grid-cols-[30px_1.35fr_1.15fr_66px_100px_108px_34px] gap-2 bg-slate-50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400"><span>#</span><span>Producto / servicio</span><span>Detalle</span><span>Cant.</span><span>Precio</span><span>Total</span><span /></div>
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:387:              <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-auto">
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:389:                  <div key={item.id} className="grid grid-cols-[30px_1.35fr_1.15fr_66px_100px_108px_34px] items-center gap-2 px-3 py-2">
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:390:                    <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-xs font-black text-slate-500">{index + 1}</span>
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:391:                    <div className="grid gap-1">
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:392:                      <select value={item.productId ?? ""} onChange={(e) => applyProduct(item.id, e.target.value)} className="h-10 min-w-0 rounded-xl border px-3 text-sm font-bold outline-none focus:border-blue-400">
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:396:                      <input value={item.name} onChange={(e) => updateItem(item.id, { name: e.target.value })} className="h-9 min-w-0 rounded-xl border px-3 text-xs font-semibold outline-none focus:border-blue-400" placeholder="Nombre manual" />
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:398:                    <input value={item.description} onChange={(e) => updateItem(item.id, { description: e.target.value })} className="h-10 min-w-0 rounded-xl border px-3 text-sm outline-none focus:border-blue-400" placeholder="Descripción" />
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:399:                    <input value={item.quantity} onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) || 0 })} type="number" className="h-10 rounded-xl border px-3 text-sm outline-none focus:border-blue-400" />
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:400:                    <input value={item.price} onChange={(e) => updateItem(item.id, { price: Number(e.target.value) || 0 })} type="number" className="h-10 rounded-xl border px-3 text-sm outline-none focus:border-blue-400" />
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:402:                    {items.length > 1 ? <button type="button" onClick={() => removeItem(item.id)} className="grid h-9 w-9 place-items-center rounded-xl text-red-500 hover:bg-red-50" title="Eliminar"><Trash2 className="h-4 w-4" /></button> : <span />}
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:409:          <div className="grid gap-3 border-t bg-white p-4 md:grid-cols-[1fr_auto]">
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:410:            <div className="grid grid-cols-4 gap-3 rounded-2xl bg-slate-50 p-3 text-sm">
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:417:              <button type="button" disabled={saving} onClick={() => void saveInvoice("Draft")} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-bold hover:bg-slate-50 disabled:opacity-60">Guardar</button>
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:418:              <button type="button" onClick={printInvoice} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-bold hover:bg-slate-50"><Printer className="h-4 w-4" />PDF</button>
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:419:              <button type="button" disabled={saving} onClick={() => void saveInvoice("Sent")} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"><Send className="h-4 w-4" />{saving ? "Guardando…" : "Enviar"}</button>
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:421:            {publicUrl ? <p className="md:col-span-2 text-xs text-slate-500">Link público: <button type="button" onClick={() => navigator.clipboard.writeText(publicUrl)} className="font-bold text-blue-600 hover:underline">copiar enlace</button></p> : null}
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:425:        <main className="flex items-start justify-center overflow-hidden print:overflow-visible">
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:426:          <div className="w-full py-2"><div className="mx-auto flex h-[calc(100vh-170px)] max-h-[calc(100vh-170px)] min-h-[560px] w-auto max-w-full flex-col"><div className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Vista móvil 9:16</div><section id="invoice-preview" className="aspect-[9/16] h-full max-h-full overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.16)] print:h-auto print:min-h-screen print:aspect-auto print:max-w-none print:rounded-none print:border-0 print:shadow-none"><div className="h-full overflow-y-auto"><div className="relative overflow-hidden px-5 pb-6 pt-6 text-white" style={{ background: `radial-gradient(circle at 85% 20%, rgba(255,255,255,0.20), transparent 28%), linear-gradient(135deg, #020817 0%, ${brandColor} 100%)` }}><div className="relative z-10 flex items-start justify-between gap-4"><div className="min-w-0"><div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-white/15 text-lg font-black backdrop-blur">{companyName.slice(0, 1).toUpperCase()}</div><h2 className="truncate text-xl font-black">{companyName}</h2><p className="mt-1 max-w-[180px] text-[12px] leading-5 text-white/80">{companySlogan}</p></div><div className="text-right"><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">Factura</p><h1 className="mt-2 text-2xl font-black">{invoiceNumber}</h1><span className="mt-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold backdrop-blur">{status}</span></div></div></div><div className="px-5 py-5"><div className="grid gap-4 border-b border-slate-200 pb-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Facturado a</p><h3 className="mt-2 text-base font-black text-slate-950">{clientName}</h3><p className="mt-1 text-[12px] text-slate-500">{clientEmail}</p><p className="text-[12px] text-slate-500">{clientPhone}</p><p className="mt-1 whitespace-pre-line text-[12px] text-slate-500">{clientAddress}</p></div><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Fecha</p><p className="mt-1 text-sm font-bold text-slate-900">{issueDate}</p></div><div className="rounded-2xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Vence</p><p className="mt-1 text-sm font-bold text-slate-900">{dueDate}</p></div></div><div className="rounded-3xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Total</p><p className="mt-1 text-2xl font-black" style={{ color: brandColor }}>{money(total)}</p></div></div><div className="mt-5 space-y-3">{items.map((item) => (<div key={item.id} className="rounded-3xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-black text-slate-950">{item.name || "Servicio"}</p><p className="mt-1 text-[12px] leading-5 text-slate-500">{item.description}</p></div><div className="text-right"><p className="text-[11px] font-semibold text-slate-400">x{item.quantity}</p><p className="mt-1 text-sm font-black text-slate-950">{money(item.quantity * item.price)}</p></div></div><div className="mt-3 flex items-center justify-between text-[12px] text-slate-500"><span>Precio unitario</span><strong className="text-slate-900">{money(item.price)}</strong></div></div>))}</div><div className="mt-5 rounded-3xl bg-slate-50 p-4"><div className="flex justify-between py-1.5 text-[13px]"><span className="text-slate-500">Subtotal</span><strong>{money(subtotal)}</strong></div><div className="flex justify-between py-1.5 text-[13px]"><span className="text-slate-500">Descuento</span><strong>- {money(discount)}</strong></div><div className="flex justify-between py-1.5 text-[13px]"><span className="text-slate-500">ITBIS ({taxRate}%)</span><strong>{money(tax)}</strong></div><div className="mt-2 flex justify-between border-t pt-3 text-base"><span className="font-black text-slate-950">Total</span><strong className="font-black" style={{ color: brandColor }}>{money(total)}</strong></div></div><div className="mt-5 space-y-4"><div><h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Notas</h3><p className="mt-2 text-[12px] leading-5 text-slate-600">{notes}</p></div><div><h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Términos</h3><p className="mt-2 text-[12px] leading-5 text-slate-600">{terms}</p></div></div><div className="mt-6 border-t border-slate-200 pt-4 text-center text-[11px] text-slate-400"><p>Generado desde Corevix CRM</p><p className="mt-1">{companyEmail}</p></div></div></div></section></div></div>
src/components/invoice-builder/invoice-builder-test.tsx.bak_rls_company_id:430:      {showAdvanced ? <div className="no-print fixed inset-0 z-50 flex justify-end bg-slate-950/30 backdrop-blur-sm"><div className="h-full w-full max-w-[520px] overflow-auto bg-white p-5 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-black">Opciones avanzadas</h2><p className="text-sm text-slate-500">Ajustes que no necesitas tocar siempre.</p></div><button type="button" onClick={() => setShowAdvanced(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-slate-100"><X className="h-5 w-5" /></button></div><div className="grid gap-4 md:grid-cols-2"><label className="grid gap-1 text-xs font-semibold text-slate-600">Empresa<input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="rounded-xl border px-3 py-2 text-sm font-normal" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Color<input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} type="color" className="h-[38px] rounded-xl border bg-white px-2 py-1" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600 md:col-span-2">Descripción empresa<input value={companySlogan} onChange={(e) => setCompanySlogan(e.target.value)} className="rounded-xl border px-3 py-2 text-sm font-normal" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Email empresa<input value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} className="rounded-xl border px-3 py-2 text-sm font-normal" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Teléfono empresa<input value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} className="rounded-xl border px-3 py-2 text-sm font-normal" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Estado<select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border px-3 py-2 text-sm font-normal"><option>Draft</option><option>Sent</option><option>Paid</option><option>Overdue</option><option>Cancelled</option></select></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Fecha<input value={issueDate} onChange={(e) => setIssueDate(e.target.value)} type="date" className="rounded-xl border px-3 py-2 text-sm font-normal" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Vence<input value={dueDate} onChange={(e) => setDueDate(e.target.value)} type="date" className="rounded-xl border px-3 py-2 text-sm font-normal" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Descuento<input value={discount} onChange={(e) => setDiscount(Number(e.target.value) || 0)} type="number" className="rounded-xl border px-3 py-2 text-sm font-normal" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">ITBIS %<input value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value) || 0)} type="number" className="rounded-xl border px-3 py-2 text-sm font-normal" /></label><textarea value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} rows={2} className="rounded-xl border px-3 py-2 text-sm md:col-span-2" placeholder="Dirección del cliente" /><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="rounded-xl border px-3 py-2 text-sm md:col-span-2" placeholder="Notas" /><textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={4} className="rounded-xl border px-3 py-2 text-sm md:col-span-2" placeholder="Términos" /></div></div></div> : null}
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:321:    <div className="min-h-[calc(100vh-88px)] bg-[#f5f7fb] text-slate-950 print:bg-white">
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:331:      <div className="no-print sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/95 px-5 backdrop-blur">
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:339:            <Eye className="h-4 w-4" />
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:343:            <Printer className="h-4 w-4" />
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:347:            <Send className="h-4 w-4" />
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:353:      <div className="grid h-[calc(100vh-152px)] gap-5 p-5 xl:grid-cols-[minmax(820px,1fr)_minmax(300px,420px)] print:block print:h-auto print:p-0">
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:354:        <aside className="no-print flex min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:357:              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-600">
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:358:                <Sparkles className="h-5 w-5" />
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:369:              <Settings2 className="h-4 w-4" />
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:374:          <div className="grid gap-3 border-b bg-slate-50 p-4 md:grid-cols-[1.5fr_1fr_1fr_120px]">
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:375:            <label className="grid gap-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:377:              <select value={selectedClientId} onChange={(e) => applyClient(e.target.value)} className="h-11 rounded-2xl border bg-white px-3 text-sm font-semibold normal-case tracking-normal outline-none focus:border-blue-400">
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:383:            <label className="grid gap-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Email<input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="h-11 rounded-2xl border bg-white px-3 text-sm normal-case tracking-normal outline-none focus:border-blue-400" /></label>
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:384:            <label className="grid gap-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Teléfono<input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="h-11 rounded-2xl border bg-white px-3 text-sm normal-case tracking-normal outline-none focus:border-blue-400" /></label>
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:385:            <label className="grid gap-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Factura<input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="h-11 rounded-2xl border bg-white px-3 text-sm font-bold normal-case tracking-normal outline-none focus:border-blue-400" /></label>
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:388:          <div className="min-h-0 flex-1 overflow-hidden p-4">
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:391:              <button type="button" onClick={addItem} className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"><Plus className="h-3.5 w-3.5" />Agregar línea</button>
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:394:            <div className="flex max-h-full flex-col overflow-hidden rounded-2xl border border-slate-200">
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:395:              <div className="grid grid-cols-[30px_1.35fr_1.15fr_66px_100px_108px_34px] gap-2 bg-slate-50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400"><span>#</span><span>Producto / servicio</span><span>Detalle</span><span>Cant.</span><span>Precio</span><span>Total</span><span /></div>
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:396:              <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-auto">
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:398:                  <div key={item.id} className="grid grid-cols-[30px_1.35fr_1.15fr_66px_100px_108px_34px] items-center gap-2 px-3 py-2">
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:399:                    <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-xs font-black text-slate-500">{index + 1}</span>
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:400:                    <div className="grid gap-1">
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:401:                      <select value={item.productId ?? ""} onChange={(e) => applyProduct(item.id, e.target.value)} className="h-10 min-w-0 rounded-xl border px-3 text-sm font-bold outline-none focus:border-blue-400">
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:405:                      <input value={item.name} onChange={(e) => updateItem(item.id, { name: e.target.value })} className="h-9 min-w-0 rounded-xl border px-3 text-xs font-semibold outline-none focus:border-blue-400" placeholder="Nombre manual" />
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:407:                    <input value={item.description} onChange={(e) => updateItem(item.id, { description: e.target.value })} className="h-10 min-w-0 rounded-xl border px-3 text-sm outline-none focus:border-blue-400" placeholder="Descripción" />
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:408:                    <input value={item.quantity} onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) || 0 })} type="number" className="h-10 rounded-xl border px-3 text-sm outline-none focus:border-blue-400" />
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:409:                    <input value={item.price} onChange={(e) => updateItem(item.id, { price: Number(e.target.value) || 0 })} type="number" className="h-10 rounded-xl border px-3 text-sm outline-none focus:border-blue-400" />
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:411:                    {items.length > 1 ? <button type="button" onClick={() => removeItem(item.id)} className="grid h-9 w-9 place-items-center rounded-xl text-red-500 hover:bg-red-50" title="Eliminar"><Trash2 className="h-4 w-4" /></button> : <span />}
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:418:          <div className="grid gap-3 border-t bg-white p-4 md:grid-cols-[1fr_auto]">
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:419:            <div className="grid grid-cols-4 gap-3 rounded-2xl bg-slate-50 p-3 text-sm">
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:426:              <button type="button" disabled={saving} onClick={() => void saveInvoice("Draft")} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-bold hover:bg-slate-50 disabled:opacity-60">Guardar</button>
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:427:              <button type="button" onClick={printInvoice} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-bold hover:bg-slate-50"><Printer className="h-4 w-4" />PDF</button>
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:428:              <button type="button" disabled={saving} onClick={() => void saveInvoice("Sent")} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"><Send className="h-4 w-4" />{saving ? "Guardando…" : "Enviar"}</button>
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:430:            {publicUrl ? <p className="md:col-span-2 text-xs text-slate-500">Link público: <button type="button" onClick={() => navigator.clipboard.writeText(publicUrl)} className="font-bold text-blue-600 hover:underline">copiar enlace</button></p> : null}
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:434:        <main className="flex items-start justify-center overflow-hidden print:overflow-visible">
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:435:          <div className="w-full py-2"><div className="mx-auto flex h-[calc(100vh-170px)] max-h-[calc(100vh-170px)] min-h-[560px] w-auto max-w-full flex-col"><div className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Vista móvil 9:16</div><section id="invoice-preview" className="aspect-[9/16] h-full max-h-full overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.16)] print:h-auto print:min-h-screen print:aspect-auto print:max-w-none print:rounded-none print:border-0 print:shadow-none"><div className="h-full overflow-y-auto"><div className="relative overflow-hidden px-5 pb-6 pt-6 text-white" style={{ background: `radial-gradient(circle at 85% 20%, rgba(255,255,255,0.20), transparent 28%), linear-gradient(135deg, #020817 0%, ${brandColor} 100%)` }}><div className="relative z-10 flex items-start justify-between gap-4"><div className="min-w-0"><div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-white/15 text-lg font-black backdrop-blur">{companyName.slice(0, 1).toUpperCase()}</div><h2 className="truncate text-xl font-black">{companyName}</h2><p className="mt-1 max-w-[180px] text-[12px] leading-5 text-white/80">{companySlogan}</p></div><div className="text-right"><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">Factura</p><h1 className="mt-2 text-2xl font-black">{invoiceNumber}</h1><span className="mt-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold backdrop-blur">{status}</span></div></div></div><div className="px-5 py-5"><div className="grid gap-4 border-b border-slate-200 pb-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Facturado a</p><h3 className="mt-2 text-base font-black text-slate-950">{clientName}</h3><p className="mt-1 text-[12px] text-slate-500">{clientEmail}</p><p className="text-[12px] text-slate-500">{clientPhone}</p><p className="mt-1 whitespace-pre-line text-[12px] text-slate-500">{clientAddress}</p></div><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Fecha</p><p className="mt-1 text-sm font-bold text-slate-900">{issueDate}</p></div><div className="rounded-2xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Vence</p><p className="mt-1 text-sm font-bold text-slate-900">{dueDate}</p></div></div><div className="rounded-3xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Total</p><p className="mt-1 text-2xl font-black" style={{ color: brandColor }}>{money(total)}</p></div></div><div className="mt-5 space-y-3">{items.map((item) => (<div key={item.id} className="rounded-3xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-black text-slate-950">{item.name || "Servicio"}</p><p className="mt-1 text-[12px] leading-5 text-slate-500">{item.description}</p></div><div className="text-right"><p className="text-[11px] font-semibold text-slate-400">x{item.quantity}</p><p className="mt-1 text-sm font-black text-slate-950">{money(item.quantity * item.price)}</p></div></div><div className="mt-3 flex items-center justify-between text-[12px] text-slate-500"><span>Precio unitario</span><strong className="text-slate-900">{money(item.price)}</strong></div></div>))}</div><div className="mt-5 rounded-3xl bg-slate-50 p-4"><div className="flex justify-between py-1.5 text-[13px]"><span className="text-slate-500">Subtotal</span><strong>{money(subtotal)}</strong></div><div className="flex justify-between py-1.5 text-[13px]"><span className="text-slate-500">Descuento</span><strong>- {money(discount)}</strong></div><div className="flex justify-between py-1.5 text-[13px]"><span className="text-slate-500">ITBIS ({taxRate}%)</span><strong>{money(tax)}</strong></div><div className="mt-2 flex justify-between border-t pt-3 text-base"><span className="font-black text-slate-950">Total</span><strong className="font-black" style={{ color: brandColor }}>{money(total)}</strong></div></div><div className="mt-5 space-y-4"><div><h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Notas</h3><p className="mt-2 text-[12px] leading-5 text-slate-600">{notes}</p></div><div><h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Términos</h3><p className="mt-2 text-[12px] leading-5 text-slate-600">{terms}</p></div></div><div className="mt-6 border-t border-slate-200 pt-4 text-center text-[11px] text-slate-400"><p>Generado desde Corevix CRM</p><p className="mt-1">{companyEmail}</p></div></div></div></section></div></div>
src/components/invoice-builder/invoice-builder-test.tsx.bak_invoice_items_rls:439:      {showAdvanced ? <div className="no-print fixed inset-0 z-50 flex justify-end bg-slate-950/30 backdrop-blur-sm"><div className="h-full w-full max-w-[520px] overflow-auto bg-white p-5 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-black">Opciones avanzadas</h2><p className="text-sm text-slate-500">Ajustes que no necesitas tocar siempre.</p></div><button type="button" onClick={() => setShowAdvanced(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-slate-100"><X className="h-5 w-5" /></button></div><div className="grid gap-4 md:grid-cols-2"><label className="grid gap-1 text-xs font-semibold text-slate-600">Empresa<input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="rounded-xl border px-3 py-2 text-sm font-normal" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Color<input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} type="color" className="h-[38px] rounded-xl border bg-white px-2 py-1" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600 md:col-span-2">Descripción empresa<input value={companySlogan} onChange={(e) => setCompanySlogan(e.target.value)} className="rounded-xl border px-3 py-2 text-sm font-normal" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Email empresa<input value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} className="rounded-xl border px-3 py-2 text-sm font-normal" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Teléfono empresa<input value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} className="rounded-xl border px-3 py-2 text-sm font-normal" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Estado<select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border px-3 py-2 text-sm font-normal"><option>Draft</option><option>Sent</option><option>Paid</option><option>Overdue</option><option>Cancelled</option></select></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Fecha<input value={issueDate} onChange={(e) => setIssueDate(e.target.value)} type="date" className="rounded-xl border px-3 py-2 text-sm font-normal" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Vence<input value={dueDate} onChange={(e) => setDueDate(e.target.value)} type="date" className="rounded-xl border px-3 py-2 text-sm font-normal" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Descuento<input value={discount} onChange={(e) => setDiscount(Number(e.target.value) || 0)} type="number" className="rounded-xl border px-3 py-2 text-sm font-normal" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">ITBIS %<input value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value) || 0)} type="number" className="rounded-xl border px-3 py-2 text-sm font-normal" /></label><textarea value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} rows={2} className="rounded-xl border px-3 py-2 text-sm md:col-span-2" placeholder="Dirección del cliente" /><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="rounded-xl border px-3 py-2 text-sm md:col-span-2" placeholder="Notas" /><textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={4} className="rounded-xl border px-3 py-2 text-sm md:col-span-2" placeholder="Términos" /></div></div></div> : null}
src/components/invoice-builder/invoice-builder-test.tsx:334:    <div className="min-h-[calc(100vh-88px)] bg-[#f5f7fb] text-slate-950 print:bg-white">
src/components/invoice-builder/invoice-builder-test.tsx:337:      <div className="no-print sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/95 px-5 backdrop-blur">
src/components/invoice-builder/invoice-builder-test.tsx:343:          <button type="button" onClick={printInvoice} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-slate-50"><Printer className="h-4 w-4" />PDF</button>
src/components/invoice-builder/invoice-builder-test.tsx:344:          <button type="button" disabled={saving} onClick={() => void saveInvoice("Sent")} className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"><Send className="h-4 w-4" />{saving ? "Guardando…" : "Enviar"}</button>
src/components/invoice-builder/invoice-builder-test.tsx:348:      <div className="grid h-[calc(100vh-152px)] gap-5 p-5 xl:grid-cols-[minmax(760px,1fr)_minmax(300px,420px)] print:block print:h-auto print:p-0">
src/components/invoice-builder/invoice-builder-test.tsx:349:        <aside className="no-print flex min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
src/components/invoice-builder/invoice-builder-test.tsx:352:              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Sparkles className="h-5 w-5" /></div>
src/components/invoice-builder/invoice-builder-test.tsx:358:            <button type="button" onClick={() => setShowAdvanced(true)} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold hover:bg-slate-50"><Settings2 className="h-4 w-4" />Avanzado</button>
src/components/invoice-builder/invoice-builder-test.tsx:361:          <div className="grid gap-4 border-b bg-slate-50 p-4 lg:grid-cols-[1fr_190px]">
src/components/invoice-builder/invoice-builder-test.tsx:362:            <label className="grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
src/components/invoice-builder/invoice-builder-test.tsx:364:              <select value={selectedCustomerKey} onChange={(e) => applyCustomer(e.target.value)} className="h-14 rounded-2xl border bg-white px-4 text-base font-bold normal-case tracking-normal outline-none focus:border-blue-400">
src/components/invoice-builder/invoice-builder-test.tsx:374:            <div className="rounded-2xl bg-white p-4 text-sm shadow-sm">
src/components/invoice-builder/invoice-builder-test.tsx:380:          <div className="min-h-0 flex-1 overflow-hidden p-4">
src/components/invoice-builder/invoice-builder-test.tsx:383:              <button type="button" onClick={addItem} className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"><Plus className="h-3.5 w-3.5" />Agregar</button>
src/components/invoice-builder/invoice-builder-test.tsx:386:            <div className="flex max-h-full flex-col overflow-hidden rounded-2xl border border-slate-200">
src/components/invoice-builder/invoice-builder-test.tsx:387:              <div className="grid grid-cols-[34px_1fr_86px_138px_38px] gap-2 bg-slate-50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400"><span>#</span><span>Producto / Servicio / Membresía / Paquete</span><span>Cant.</span><span>Total</span><span /></div>
src/components/invoice-builder/invoice-builder-test.tsx:388:              <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-auto">
src/components/invoice-builder/invoice-builder-test.tsx:390:                  <div key={item.id} className="grid grid-cols-[34px_1fr_86px_138px_38px] items-center gap-2 px-3 py-3">
src/components/invoice-builder/invoice-builder-test.tsx:391:                    <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-xs font-black text-slate-500">{index + 1}</span>
src/components/invoice-builder/invoice-builder-test.tsx:392:                    <select value={item.catalogType && item.catalogId ? `${item.catalogType}:${item.catalogId}` : ""} onChange={(e) => applyCatalog(item.id, e.target.value)} className="h-12 min-w-0 rounded-xl border px-3 text-sm font-bold outline-none focus:border-blue-400">
src/components/invoice-builder/invoice-builder-test.tsx:396:                    <input value={item.quantity} onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) || 0 })} type="number" className="h-12 rounded-xl border px-3 text-sm outline-none focus:border-blue-400" />
src/components/invoice-builder/invoice-builder-test.tsx:398:                    {items.length > 1 ? <button type="button" onClick={() => removeItem(item.id)} className="grid h-10 w-10 place-items-center rounded-xl text-red-500 hover:bg-red-50" title="Eliminar"><Trash2 className="h-4 w-4" /></button> : <span />}
src/components/invoice-builder/invoice-builder-test.tsx:405:          <div className="grid gap-3 border-t bg-white p-4 md:grid-cols-[1fr_auto]">
src/components/invoice-builder/invoice-builder-test.tsx:406:            <div className="grid grid-cols-4 gap-3 rounded-2xl bg-slate-50 p-3 text-sm">
src/components/invoice-builder/invoice-builder-test.tsx:413:              <button type="button" disabled={saving} onClick={() => void saveInvoice("Draft")} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-bold hover:bg-slate-50 disabled:opacity-60">Guardar</button>
src/components/invoice-builder/invoice-builder-test.tsx:414:              <button type="button" disabled={saving} onClick={() => void saveInvoice("Sent")} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"><Send className="h-4 w-4" />{saving ? "Guardando…" : "Enviar"}</button>
src/components/invoice-builder/invoice-builder-test.tsx:416:            {publicUrl ? <p className="md:col-span-2 text-xs text-slate-500">Link público: <button type="button" onClick={() => navigator.clipboard.writeText(publicUrl)} className="font-bold text-blue-600 hover:underline">copiar enlace</button></p> : null}
src/components/invoice-builder/invoice-builder-test.tsx:420:        <main className="flex items-start justify-center overflow-hidden print:overflow-visible">
src/components/invoice-builder/invoice-builder-test.tsx:421:          <div className="w-full py-2"><div className="mx-auto flex h-[calc(100vh-170px)] max-h-[calc(100vh-170px)] min-h-[560px] w-auto max-w-full flex-col"><div className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Vista móvil 9:16</div><section id="invoice-preview" className="aspect-[9/16] h-full max-h-full overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.16)] print:h-auto print:min-h-screen print:aspect-auto print:max-w-none print:rounded-none print:border-0 print:shadow-none"><div className="h-full overflow-y-auto"><div className="relative overflow-hidden px-5 pb-6 pt-6 text-white" style={{ background: `radial-gradient(circle at 85% 20%, rgba(255,255,255,0.20), transparent 28%), linear-gradient(135deg, #020817 0%, ${brandColor} 100%)` }}><div className="relative z-10 flex items-start justify-between gap-4"><div className="min-w-0"><div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-white/15 text-lg font-black backdrop-blur">{companyName.slice(0, 1).toUpperCase()}</div><h2 className="truncate text-xl font-black">{companyName}</h2><p className="mt-1 max-w-[180px] text-[12px] leading-5 text-white/80">{companySlogan}</p></div><div className="text-right"><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">Factura</p><h1 className="mt-2 text-2xl font-black">{invoiceNumber}</h1><span className="mt-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold backdrop-blur">{status}</span></div></div></div><div className="px-5 py-5"><div className="grid gap-4 border-b border-slate-200 pb-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Facturado a</p><h3 className="mt-2 text-base font-black text-slate-950">{clientName}</h3><p className="mt-1 text-[12px] text-slate-500">{clientEmail}</p><p className="text-[12px] text-slate-500">{clientPhone}</p><p className="mt-1 whitespace-pre-line text-[12px] text-slate-500">{clientAddress}</p></div><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Fecha</p><p className="mt-1 text-sm font-bold text-slate-900">{issueDate}</p></div><div className="rounded-2xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Vence</p><p className="mt-1 text-sm font-bold text-slate-900">{dueDate}</p></div></div><div className="rounded-3xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Total</p><p className="mt-1 text-2xl font-black" style={{ color: brandColor }}>{money(total)}</p></div></div><div className="mt-5 space-y-3">{items.map((item) => (<div key={item.id} className="rounded-3xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-black text-slate-950">{item.name || "Artículo"}</p><p className="mt-1 text-[12px] leading-5 text-slate-500">{item.description}</p></div><div className="text-right"><p className="text-[11px] font-semibold text-slate-400">x{item.quantity}</p><p className="mt-1 text-sm font-black text-slate-950">{money(item.quantity * item.price)}</p></div></div><div className="mt-3 flex items-center justify-between text-[12px] text-slate-500"><span>Precio unitario</span><strong className="text-slate-900">{money(item.price)}</strong></div></div>))}</div><div className="mt-5 rounded-3xl bg-slate-50 p-4"><div className="flex justify-between py-1.5 text-[13px]"><span className="text-slate-500">Subtotal</span><strong>{money(subtotal)}</strong></div><div className="flex justify-between py-1.5 text-[13px]"><span className="text-slate-500">Descuento</span><strong>- {money(discount)}</strong></div><div className="flex justify-between py-1.5 text-[13px]"><span className="text-slate-500">ITBIS ({taxRate}%)</span><strong>{money(tax)}</strong></div><div className="mt-2 flex justify-between border-t pt-3 text-base"><span className="font-black text-slate-950">Total</span><strong className="font-black" style={{ color: brandColor }}>{money(total)}</strong></div></div><div className="mt-5 space-y-4"><div><h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Notas</h3><p className="mt-2 text-[12px] leading-5 text-slate-600">{notes}</p></div><div><h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Términos</h3><p className="mt-2 text-[12px] leading-5 text-slate-600">{terms}</p></div></div><div className="mt-6 border-t border-slate-200 pt-4 text-center text-[11px] text-slate-400"><p>Generado desde Corevix CRM</p><p className="mt-1">{companyEmail}</p></div></div></div></section></div></div>
src/components/invoice-builder/invoice-builder-test.tsx:425:      {showAdvanced ? <div className="no-print fixed inset-0 z-50 flex justify-end bg-slate-950/30 backdrop-blur-sm"><div className="h-full w-full max-w-[560px] overflow-auto bg-white p-5 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-black">Opciones avanzadas</h2><p className="text-sm text-slate-500">Editar datos manuales, precios personalizados y condiciones.</p></div><button type="button" onClick={() => setShowAdvanced(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-slate-100"><X className="h-5 w-5" /></button></div><div className="grid gap-4 md:grid-cols-2"><label className="grid gap-1 text-xs font-semibold text-slate-600 md:col-span-2">Nombre cliente/prospecto<input value={clientName} onChange={(e) => setClientName(e.target.value)} className="rounded-xl border px-3 py-2 text-sm" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Email<input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="rounded-xl border px-3 py-2 text-sm" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Teléfono<input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="rounded-xl border px-3 py-2 text-sm" /></label><textarea value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} rows={2} className="rounded-xl border px-3 py-2 text-sm md:col-span-2" placeholder="Dirección" /><label className="grid gap-1 text-xs font-semibold text-slate-600">Empresa<input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="rounded-xl border px-3 py-2 text-sm" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Color<input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} type="color" className="h-[38px] rounded-xl border bg-white px-2 py-1" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600 md:col-span-2">Descripción empresa<input value={companySlogan} onChange={(e) => setCompanySlogan(e.target.value)} className="rounded-xl border px-3 py-2 text-sm" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Email empresa<input value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} className="rounded-xl border px-3 py-2 text-sm" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Teléfono empresa<input value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} className="rounded-xl border px-3 py-2 text-sm" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Factura<input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="rounded-xl border px-3 py-2 text-sm" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Estado<select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border px-3 py-2 text-sm"><option>Draft</option><option>Sent</option><option>Paid</option><option>Overdue</option><option>Cancelled</option></select></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Fecha<input value={issueDate} onChange={(e) => setIssueDate(e.target.value)} type="date" className="rounded-xl border px-3 py-2 text-sm" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Vence<input value={dueDate} onChange={(e) => setDueDate(e.target.value)} type="date" className="rounded-xl border px-3 py-2 text-sm" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Descuento<input value={discount} onChange={(e) => setDiscount(Number(e.target.value) || 0)} type="number" className="rounded-xl border px-3 py-2 text-sm" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">ITBIS %<input value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value) || 0)} type="number" className="rounded-xl border px-3 py-2 text-sm" /></label><div className="md:col-span-2 rounded-2xl border p-4"><h3 className="mb-3 font-black">Edición manual de líneas</h3><div className="grid gap-3">{items.map((item) => <div key={item.id} className="grid gap-2 rounded-xl bg-slate-50 p-3"><input value={item.name} onChange={(e) => updateItem(item.id, { name: e.target.value })} className="rounded-xl border px-3 py-2 text-sm font-bold" placeholder="Nombre" /><textarea value={item.description} onChange={(e) => updateItem(item.id, { description: e.target.value })} rows={2} className="rounded-xl border px-3 py-2 text-sm" placeholder="Descripción" /><div className="grid grid-cols-2 gap-2"><input value={item.price} onChange={(e) => updateItem(item.id, { price: Number(e.target.value) || 0 })} type="number" className="rounded-xl border px-3 py-2 text-sm" placeholder="Precio" /><input value={item.quantity} onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) || 0 })} type="number" className="rounded-xl border px-3 py-2 text-sm" placeholder="Cantidad" /></div></div>)}</div></div><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="rounded-xl border px-3 py-2 text-sm md:col-span-2" placeholder="Notas" /><textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={4} className="rounded-xl border px-3 py-2 text-sm md:col-span-2" placeholder="Términos" /></div></div></div> : null}
src/components/profile/profile-work-monitor.tsx:16:import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
src/components/profile/profile-work-monitor.tsx:64:    <Link to={href} className="rounded-2xl border bg-white p-4 transition hover:border-blue-200 hover:shadow-sm">
src/components/profile/profile-work-monitor.tsx:66:        <span className={`grid h-10 w-10 place-items-center rounded-2xl ${toneClass}`}>
src/components/profile/profile-work-monitor.tsx:67:          <Icon className="h-5 w-5" />
src/components/profile/profile-work-monitor.tsx:136:          <RefreshCw className="mr-2 h-4 w-4" />
src/components/profile/profile-work-monitor.tsx:141:      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
src/components/profile/profile-work-monitor.tsx:149:      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
src/components/profile/profile-work-monitor.tsx:150:        <Card className="border-0 shadow-sm">
src/components/profile/profile-work-monitor.tsx:153:              <Activity className="h-4 w-4" />
src/components/profile/profile-work-monitor.tsx:161:                  <div key={item} className="h-14 animate-pulse rounded-xl bg-slate-100" />
src/components/profile/profile-work-monitor.tsx:169:                      <div className="min-w-0">
src/components/profile/profile-work-monitor.tsx:173:                      <Badge variant="secondary" className="w-fit shrink-0">
src/components/profile/profile-work-monitor.tsx:189:        <Card className="border-0 shadow-sm">
src/components/ai/AgenticPrompt.css:11:  overflow-y: auto;
src/components/ai/AgenticPrompt.css:13:  overflow-wrap: anywhere;
src/components/ai/AgenticPrompt.css:16:  transition: height 0.12s ease;
src/components/ai/AgenticPrompt.css:29:  min-height: 36px;
src/components/ai/AgenticPrompt.css:37:  height: 34px;
src/components/ai/AgenticPrompt.css:43:  line-height: 1;
src/components/ai/AgenticPrompt.css:47:  display: inline-grid;
src/components/ai/AgenticPrompt.css:49:  height: 22px;
src/components/ai/AgenticPrompt.css:65:  display: inline-grid;
src/components/ai/AgenticPrompt.css:67:  height: 20px;
src/components/ai/AgenticPrompt.css:106:  height: 22px;
src/components/ai/AgenticPrompt.css:116:/* Embedded CRM layout fixes: keep global sidebar/topbar visible and keep chat scroll inside the agent. */
src/components/ai/AgenticPrompt.css:118:.agentic-ai-layout,
src/components/ai/AgenticPrompt.css:124:  min-height: 0;
src/components/ai/AgenticPrompt.css:128:  height: 100%;
src/components/ai/AgenticPrompt.css:129:  grid-template-rows: minmax(0, 1fr) auto;
src/components/ai/AgenticPrompt.css:135:  height: 100%;
src/components/ai/AgenticPrompt.css:139:  height: 100%;
src/components/ai/AgenticPrompt.css:140:  overflow-y: auto;
src/components/ai/AgenticPrompt.css:172:.agentic-ai-widget-zone {
src/components/ai/AgenticPrompt.css:174:  display: grid;
src/components/ai/AgenticPrompt.css:178:.agentic-ai-widget-card {
src/components/ai/AgenticPrompt.css:186:@media (max-height: 780px) {
src/components/ai/AgenticPrompt.css:194:    height: 42px;
src/components/ai/AgenticPrompt.css:226:/* Mobile agent: context belongs to the composer, not to a separate top widget. */
src/components/ai/AgenticPrompt.css:229:    --corevix-mobile-composer-height: 78px;
src/components/ai/AgenticPrompt.css:231:    height: 100%;
src/components/ai/AgenticPrompt.css:232:    max-height: 100%;
src/components/ai/AgenticPrompt.css:236:  .agentic-ai-layout,
src/components/ai/AgenticPrompt.css:237:  .agentic-ai-layout.is-panel-closed {
src/components/ai/AgenticPrompt.css:238:    display: grid !important;
src/components/ai/AgenticPrompt.css:239:    grid-template-columns: minmax(0, 1fr) !important;
src/components/ai/AgenticPrompt.css:240:    grid-template-rows: minmax(0, 1fr) !important;
src/components/ai/AgenticPrompt.css:241:    height: 100%;
src/components/ai/AgenticPrompt.css:253:    min-height: 0;
src/components/ai/AgenticPrompt.css:262:    height: 100% !important;
src/components/ai/AgenticPrompt.css:264:    grid-template-rows: minmax(0, 1fr) !important;
src/components/ai/AgenticPrompt.css:269:    height: 100% !important;
src/components/ai/AgenticPrompt.css:271:    padding-bottom: var(--corevix-mobile-composer-height) !important;
src/components/ai/AgenticPrompt.css:275:    height: 100% !important;
src/components/ai/AgenticPrompt.css:279:    height: 100% !important;
src/components/ai/AgenticPrompt.css:280:    padding: 14px 10px calc(var(--corevix-mobile-composer-height) + 42px) !important;
src/components/ai/AgenticPrompt.css:281:    overflow-y: auto !important;
src/components/ai/AgenticPrompt.css:284:    -webkit-overflow-scrolling: touch;
src/components/ai/AgenticPrompt.css:289:    --corevix-mobile-composer-height: 360px;
src/components/ai/AgenticPrompt.css:302:    line-height: 1.5 !important;
src/components/ai/AgenticPrompt.css:335:    min-height: 52px;
src/components/ai/AgenticPrompt.css:350:    min-height: 38px !important;
src/components/ai/AgenticPrompt.css:351:    max-height: 108px !important;
src/components/ai/AgenticPrompt.css:353:    line-height: 1.25 !important;
src/components/ai/AgenticPrompt.css:366:    display: grid;
src/components/ai/AgenticPrompt.css:367:    grid-template-columns: 34px minmax(0, 1fr) 32px;
src/components/ai/AgenticPrompt.css:380:    height: 32px;
src/components/ai/AgenticPrompt.css:381:    display: grid;
src/components/ai/AgenticPrompt.css:414:    line-height: 1.1;
src/components/ai/AgenticPrompt.css:422:    line-height: 1.2;
src/components/ai/AgenticPrompt.css:427:    height: 32px;
src/components/ai/AgenticPrompt.css:428:    display: grid;
src/components/ai/AgenticPrompt.css:441:    max-height: 0;
src/components/ai/AgenticPrompt.css:445:    transition: max-height 0.28s cubic-bezier(0.2, 0.9, 0.2, 1), opacity 0.2s ease, padding 0.22s ease;
src/components/ai/AgenticPrompt.css:449:    max-height: 390px;
src/components/ai/AgenticPrompt.css:478:    display: grid;
src/components/ai/AgenticPrompt.css:479:    grid-template-columns: 1fr 1fr;
src/components/ai/AgenticPrompt.css:516:    display: grid;
src/components/ai/AgenticPrompt.css:521:    display: grid;
src/components/ai/AgenticPrompt.css:522:    grid-template-columns: 28px minmax(0, 1fr) auto;
src/components/ai/AgenticPrompt.css:533:  .agentic-ai-action-row-dot {
src/components/ai/AgenticPrompt.css:535:    height: 28px;
src/components/ai/AgenticPrompt.css:541:  .agentic-ai-action-row-dot.is-blue,
src/components/ai/AgenticPrompt.css:543:  .agentic-ai-action-row-dot.is-red,
src/components/ai/AgenticPrompt.css:545:  .agentic-ai-action-row-dot.is-orange,
src/components/ai/AgenticPrompt.css:547:  .agentic-ai-action-row-dot.is-purple,
src/components/ai/AgenticPrompt.css:549:  .agentic-ai-action-row-dot.is-teal,
src/components/ai/AgenticPrompt.css:582:    display: grid;
src/components/ai/AgenticPrompt.css:597:    line-height: 1.35;
src/components/ai/AgenticPrompt.css:608:    line-height: 1.35;
src/components/ai/agentToolContext.ts:164:  new_leads_today: { id: "metric-new-leads", label: "Ver leads", href: "/leads?chip=today", intent: "filter", tone: "blue" },
src/components/ai/agentToolContext.ts:296:    id: `view-${entityType}-${row.id}`,
src/components/ai/AgentContextPanel.tsx:191:      <div className="agent-context-empty-icon"><Sparkles className="h-4 w-4" /></div>
src/components/ai/AgentContextPanel.tsx:220:      <span className={`agent-focused-row-icon ${toneClass(row.tone)}`} />
src/components/ai/AgentContextPanel.tsx:243:    <div className="agent-focused-widget">
src/components/ai/AgentContextPanel.tsx:244:      <section className={`agent-focused-hero is-${meta.tone}`}>
src/components/ai/AgentContextPanel.tsx:245:        <div className="agent-focused-icon"><Icon className="h-4 w-4" /></div>
src/components/ai/AgentContextPanel.tsx:252:      </section>
src/components/ai/AgentContextPanel.tsx:261:        <section className="agent-context-card agent-focused-list-card">
src/components/ai/AgentContextPanel.tsx:265:        </section>
src/components/ai/AgentContextPanel.tsx:269:        <section className="agent-context-card agent-focused-list-card">
src/components/ai/AgentContextPanel.tsx:277:        </section>
src/components/ai/AgentContextPanel.tsx:280:      <section className="agent-focused-next-step">
src/components/ai/AgentContextPanel.tsx:281:        <Sparkles className="h-3.5 w-3.5" />
src/components/ai/AgentContextPanel.tsx:283:      </section>
src/components/ai/AgentContextPanel.tsx:293:      <section className="agent-context-card is-error">
src/components/ai/AgentContextPanel.tsx:296:      </section>
src/components/ai/AgentContextPanel.tsx:307:      <section className="agent-context-card">
src/components/ai/AgentContextPanel.tsx:310:      </section>
src/components/ai/AgentContextPanel.tsx:316:      <section className="agent-context-card is-highlighted">
src/components/ai/AgentContextPanel.tsx:324:      </section>
src/components/ai/AgentContextPanel.tsx:327:        <section className="agent-context-card">
src/components/ai/AgentContextPanel.tsx:331:        </section>
src/components/ai/AgentContextPanel.tsx:335:        <section className="agent-context-card">
src/components/ai/AgentContextPanel.tsx:358:        </section>
src/components/ai/AgentContextPanel.tsx:374:        <Search className="h-4 w-4" />
src/components/ai/AgentContextPanel.tsx:393:              <small><Clock3 className="h-3 w-3" /> {thread.updatedAt}</small>
src/components/ai/AgentContextPanel.tsx:416:        <button type="button" onClick={onNewThread} className="agent-context-new-chat">
src/components/ai/AgentContextPanel.tsx:417:          <Plus className="h-4 w-4" />
src/components/ai/AgentContextPanel.tsx:422:          <button type="button" className={mode === "history" ? "is-active" : ""} onClick={() => setMode("history")}><History className="h-3.5 w-3.5" /> Historial</button>
src/components/ai/CrmAiFloatingChat.tsx:64:          className="mt-2 overflow-auto rounded-xl border border-[#e6eaf0] bg-[#0b1220] p-3 text-[12px] text-white"
src/components/ai/CrmAiFloatingChat.tsx:111:          className={line.trim() ? "text-[13px] leading-relaxed text-[#111827]" : "h-2"}
src/components/ai/CrmAiFloatingChat.tsx:284:        className="fixed bottom-6 right-6 z-[70] inline-flex items-center gap-2 rounded-2xl bg-[#1d62f9] px-4 py-3 text-[13px] font-extrabold text-white shadow-[0_18px_45px_rgba(29,98,249,0.35)] hover:opacity-95"
src/components/ai/CrmAiFloatingChat.tsx:287:        <Sparkles className="h-[18px] w-[18px]" />
src/components/ai/CrmAiFloatingChat.tsx:293:          className="fixed z-[70] inset-x-4 bottom-4 top-20 sm:inset-auto sm:bottom-6 sm:right-6 sm:top-auto sm:left-auto sm:h-[620px] sm:w-[420px] sm:max-h-[calc(100vh-120px)]"
src/components/ai/CrmAiFloatingChat.tsx:297:          <div className="h-full w-full rounded-2xl border border-[#e6eaf0] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.18)] flex flex-col overflow-hidden">
src/components/ai/CrmAiFloatingChat.tsx:300:                <div className="flex items-start gap-3 min-w-0">
src/components/ai/CrmAiFloatingChat.tsx:301:                  <div className="h-9 w-9 rounded-xl bg-[#edf5ff] text-[#1d62f9] grid place-items-center shrink-0">
src/components/ai/CrmAiFloatingChat.tsx:302:                    <Bot className="h-[18px] w-[18px]" />
src/components/ai/CrmAiFloatingChat.tsx:304:                  <div className="min-w-0">
src/components/ai/CrmAiFloatingChat.tsx:316:                  className="h-9 w-9 rounded-xl border border-[#e6eaf0] bg-white grid place-items-center text-[#667085] hover:bg-[#f9fafc]"
src/components/ai/CrmAiFloatingChat.tsx:319:                  <X className="h-[18px] w-[18px]" />
src/components/ai/CrmAiFloatingChat.tsx:324:            <div ref={scrollRef} className="flex-1 overflow-auto bg-[#fbfcfe] px-4 py-4 space-y-3">
src/components/ai/CrmAiFloatingChat.tsx:331:                        "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm " +
src/components/ai/CrmAiFloatingChat.tsx:374:                  className="flex-1 h-11 rounded-2xl border border-[#e6eaf0] bg-white px-3 text-[13px] font-semibold text-[#111827] placeholder:text-[#98a2b3] focus:outline-none focus:ring-2 focus:ring-[#1d62f9]/30"
src/components/ai/CrmAiFloatingChat.tsx:379:                  className="h-11 w-11 rounded-2xl bg-[#1d62f9] text-white grid place-items-center shadow-[0_14px_26px_rgba(29,98,249,0.28)] disabled:opacity-50"
src/components/ai/CrmAiFloatingChat.tsx:382:                  <Send className="h-[18px] w-[18px]" />
src/components/ai/AgentChat.tsx:238:function ScopeIcon({ scope, className = "h-3.5 w-3.5" }: { scope: AgentToolScope; className?: string }) {
src/components/ai/AgentChat.tsx:281:          <ChevronUp className="h-4 w-4" />
src/components/ai/AgentChat.tsx:287:          <Icon className="h-3.5 w-3.5" />
src/components/ai/AgentChat.tsx:318:                  <span className={`agentic-ai-action-row-dot ${toneClass(row.tone || tone)}`} />
src/components/ai/AgentChat.tsx:346:          <Sparkles className="h-3.5 w-3.5" />
src/components/ai/AgentChat.tsx:384:  const resizeTextarea = () => {
src/components/ai/AgentChat.tsx:388:    el.style.height = "auto";
src/components/ai/AgentChat.tsx:389:    el.style.height = `${Math.min(el.scrollHeight, 156)}px`;
src/components/ai/AgentChat.tsx:437:            <X className="h-3 w-3" />
src/components/ai/AgentChat.tsx:450:          <span className="agentic-ai-tab-hint"><Keyboard className="h-3 w-3" /> Tab</span>
src/components/ai/AgentChat.tsx:462:        ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
src/components/ai/AgentChat.tsx:469:    window.addEventListener("resize", updateVisualViewportInset);
src/components/ai/AgentChat.tsx:470:    window.visualViewport?.addEventListener("resize", updateVisualViewportInset);
src/components/ai/AgentChat.tsx:474:      window.removeEventListener("resize", updateVisualViewportInset);
src/components/ai/AgentChat.tsx:475:      window.visualViewport?.removeEventListener("resize", updateVisualViewportInset);
src/components/ai/AgentChat.tsx:492:    resizeTextarea();
src/components/ai/AgentChat.tsx:501:            <div className={`max-w-[86%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${isUser ? "bg-[#1d62f9] text-white" : "border border-[#e6eaf0] bg-white text-[#111827]"}`}>
src/components/ai/AgentChat.tsx:513:      <div className={`flex h-full flex-col overflow-hidden bg-white ${compact ? "" : "min-h-[620px]"}`}>
src/components/ai/AgentChat.tsx:519:        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-[#fbfcfe] p-4">
src/components/ai/AgentChat.tsx:524:          <input className="h-11 flex-1 rounded-2xl border border-[#e6eaf0] px-3 text-sm" value={text} onChange={(e) => setText(e.target.value)} placeholder="Pregúntale algo a Corevix AI..." />
src/components/ai/AgentChat.tsx:525:          <button className="grid h-11 w-11 place-items-center rounded-2xl bg-[#1d62f9] text-white disabled:opacity-50" type="submit" disabled={loading || !text.trim()}>
src/components/ai/AgentChat.tsx:526:            <Send className="h-4 w-4" />
src/components/ai/AgentChat.tsx:535:      <div className={`agentic-ai-layout ${sidebarOpen ? "" : "is-panel-closed"}`}>
src/components/ai/AgentChat.tsx:552:                <PanelLeft className="h-4 w-4" />
src/components/ai/AgentChat.tsx:562:          <section className="agentic-ai-stage">
src/components/ai/AgentChat.tsx:574:                    <div className="agentic-ai-orb"><Bot className="h-6 w-6" /></div>
src/components/ai/AgentChat.tsx:586:                      <button type="button" className="agentic-ai-input-action" aria-label="Nueva accion"><Plus className="h-4 w-4" /></button>
src/components/ai/AgentChat.tsx:597:                      <button type="submit" disabled={loading || !text.trim()} className="agentic-ai-send" aria-label="Enviar"><Send className="h-4 w-4" /></button>
src/components/ai/AgentChat.tsx:603:                          <Sparkles className="h-4 w-4" />
src/components/ai/AgentChat.tsx:647:                    <button type="button" className="agentic-ai-input-action" aria-label="Nueva accion"><Plus className="h-4 w-4" /></button>
src/components/ai/AgentChat.tsx:658:                    <button type="submit" disabled={loading || !text.trim()} className="agentic-ai-send" aria-label="Enviar"><Send className="h-4 w-4" /></button>
src/components/ai/AgentChat.tsx:663:          </section>
src/components/ai/AgenticAgentShell.css:19:  height: 100%;
src/components/ai/AgenticAgentShell.css:20:  min-height: 0;
src/components/ai/AgenticAgentShell.css:39:.agentic-ai-layout {
src/components/ai/AgenticAgentShell.css:40:  height: 100%;
src/components/ai/AgenticAgentShell.css:41:  min-height: 0;
src/components/ai/AgenticAgentShell.css:42:  display: grid;
src/components/ai/AgenticAgentShell.css:43:  grid-template-columns: minmax(230px, 292px) minmax(0, 1fr);
src/components/ai/AgenticAgentShell.css:47:  min-height: 0;
src/components/ai/AgenticAgentShell.css:61:.agentic-ai-new-chat {
src/components/ai/AgenticAgentShell.css:62:  height: 42px;
src/components/ai/AgenticAgentShell.css:77:  height: 42px;
src/components/ai/AgenticAgentShell.css:89:  height: 16px;
src/components/ai/AgenticAgentShell.css:104:  min-height: 0;
src/components/ai/AgenticAgentShell.css:106:  overflow-y: auto;
src/components/ai/AgenticAgentShell.css:109:.agentic-ai-section-label {
src/components/ai/AgenticAgentShell.css:131:  display: grid;
src/components/ai/AgenticAgentShell.css:185:  min-height: 0;
src/components/ai/AgenticAgentShell.css:191:  height: 64px;
src/components/ai/AgenticAgentShell.css:212:  height: 38px;
src/components/ai/AgenticAgentShell.css:251:  min-height: 0;
src/components/ai/AgenticAgentShell.css:253:  display: grid;
src/components/ai/AgenticAgentShell.css:254:  grid-template-rows: auto minmax(0, 1fr) auto;
src/components/ai/AgenticAgentShell.css:289:  height: 22px;
src/components/ai/AgenticAgentShell.css:290:  display: grid;
src/components/ai/AgenticAgentShell.css:299:  min-height: 0;
src/components/ai/AgenticAgentShell.css:310:  min-height: 100%;
src/components/ai/AgenticAgentShell.css:311:  display: grid;
src/components/ai/AgenticAgentShell.css:326:  height: 58px;
src/components/ai/AgenticAgentShell.css:327:  display: grid;
src/components/ai/AgenticAgentShell.css:346:  line-height: 1.04;
src/components/ai/AgenticAgentShell.css:355:  line-height: 1.45;
src/components/ai/AgenticAgentShell.css:377:  height: 42px;
src/components/ai/AgenticAgentShell.css:379:  display: grid;
src/components/ai/AgenticAgentShell.css:402:  min-height: 42px;
src/components/ai/AgenticAgentShell.css:403:  max-height: 144px;
src/components/ai/AgenticAgentShell.css:405:  resize: none;
src/components/ai/AgenticAgentShell.css:411:  line-height: 1.35;
src/components/ai/AgenticAgentShell.css:425:  min-height: 40px;
src/components/ai/AgenticAgentShell.css:447:  min-height: 100%;
src/components/ai/AgenticAgentShell.css:448:  display: grid;
src/components/ai/AgenticAgentShell.css:449:  grid-template-rows: minmax(0, 1fr);
src/components/ai/AgenticAgentShell.css:453:  min-height: 0;
src/components/ai/AgenticAgentShell.css:454:  overflow-y: auto;
src/components/ai/AgenticAgentShell.css:484:  line-height: 1.72;
src/components/ai/AgenticAgentShell.css:523:  height: 6px;
src/components/ai/AgenticAgentShell.css:530:.agentic-ai-dots span:nth-child(2) {
src/components/ai/AgenticAgentShell.css:534:.agentic-ai-dots span:nth-child(3) {
src/components/ai/AgenticAgentShell.css:550:  .agentic-ai-layout {
src/components/ai/AgenticAgentShell.css:551:    grid-template-columns: 1fr;
src/components/ai/AgenticAgentShell.css:565:    display: grid;
src/components/ai/AgenticAgentShell.css:578:    overflow-x: auto;
src/components/ai/AgenticAgentShell.css:612:    height: 38px;
src/components/ai/AgenticAgentShell.css:617:    display: grid;
src/components/ai/AgenticAgentShell.css:618:    grid-template-columns: 1fr;
src/components/ai/AgenticAgentShell.css:627:.agentic-ai-layout {
src/components/ai/AgenticAgentShell.css:628:  grid-template-columns: minmax(216px, 268px) minmax(0, 1fr);
src/components/ai/AgenticAgentShell.css:636:.agentic-ai-new-chat,
src/components/ai/AgenticAgentShell.css:638:  height: 38px;
src/components/ai/AgenticAgentShell.css:657:  height: 54px;
src/components/ai/AgenticAgentShell.css:663:  height: 34px;
src/components/ai/AgenticAgentShell.css:681:  grid-template-rows: minmax(0, 1fr) auto;
src/components/ai/AgenticAgentShell.css:695:  height: 48px;
src/components/ai/AgenticAgentShell.css:724:  height: 38px;
src/components/ai/AgenticAgentShell.css:730:  min-height: 38px;
src/components/ai/AgenticAgentShell.css:731:  max-height: 120px;
src/components/ai/AgenticAgentShell.css:742:  min-height: 36px;
src/components/ai/AgenticAgentShell.css:756:  line-height: 1.55;
src/components/ai/AgenticAgentShell.css:773:  .agentic-ai-layout {
src/components/ai/AgenticAgentShell.css:774:    grid-template-columns: 1fr;
src/components/ai/AgenticAgentShell.css:793:    height: 50px;
src/components/ai/AgenticAgentShell.css:809:  min-height: 0;
src/components/ai/AgenticAgentShell.css:816:.agentic-ai-layout.is-panel-closed {
src/components/ai/AgenticAgentShell.css:817:  grid-template-columns: minmax(0, 1fr);
src/components/ai/AgenticAgentShell.css:835:  display: grid;
src/components/ai/AgenticAgentShell.css:836:  grid-template-rows: minmax(0, 1fr);
src/components/ai/AgenticAgentShell.css:840:  height: 100%;
src/components/ai/AgenticAgentShell.css:841:  min-height: 0;
src/components/ai/AgenticAgentShell.css:846:  height: 100%;
src/components/ai/AgenticAgentShell.css:847:  min-height: 0;
src/components/ai/AgenticAgentShell.css:848:  overflow-y: auto;
src/components/ai/AgentContextPanel.css:2:  height: 100%;
src/components/ai/AgentContextPanel.css:3:  min-height: 0;
src/components/ai/AgentContextPanel.css:14:  display: grid;
src/components/ai/AgentContextPanel.css:18:.agent-context-new-chat {
src/components/ai/AgentContextPanel.css:19:  height: 38px;
src/components/ai/AgentContextPanel.css:34:  display: grid;
src/components/ai/AgentContextPanel.css:35:  grid-template-columns: 1fr 1fr;
src/components/ai/AgentContextPanel.css:45:  height: 32px;
src/components/ai/AgentContextPanel.css:66:  min-height: 0;
src/components/ai/AgentContextPanel.css:68:  overflow-y: auto;
src/components/ai/AgentContextPanel.css:72:  display: grid;
src/components/ai/AgentContextPanel.css:76:.agent-context-card,
src/components/ai/AgentContextPanel.css:84:.agent-context-card {
src/components/ai/AgentContextPanel.css:88:.agent-context-card.is-highlighted {
src/components/ai/AgentContextPanel.css:93:.agent-context-card.is-error {
src/components/ai/AgentContextPanel.css:98:.agent-context-card h3,
src/components/ai/AgentContextPanel.css:107:.agent-context-card p,
src/components/ai/AgentContextPanel.css:112:  line-height: 1.45;
src/components/ai/AgentContextPanel.css:117:  min-height: 190px;
src/components/ai/AgentContextPanel.css:118:  display: grid;
src/components/ai/AgentContextPanel.css:126:  height: 38px;
src/components/ai/AgentContextPanel.css:127:  display: grid;
src/components/ai/AgentContextPanel.css:136:  display: grid;
src/components/ai/AgentContextPanel.css:137:  grid-template-columns: 1fr 1fr;
src/components/ai/AgentContextPanel.css:167:  display: grid;
src/components/ai/AgentContextPanel.css:172:  display: grid;
src/components/ai/AgentContextPanel.css:173:  grid-template-columns: 30px minmax(0, 1fr) auto;
src/components/ai/AgentContextPanel.css:186:  height: 30px;
src/components/ai/AgentContextPanel.css:235:  min-height: 0;
src/components/ai/AgentContextPanel.css:236:  display: grid;
src/components/ai/AgentContextPanel.css:241:  height: 38px;
src/components/ai/AgentContextPanel.css:284:  display: grid;
src/components/ai/AgentContextPanel.css:339:.agent-focused-widget {
src/components/ai/AgentContextPanel.css:340:  display: grid;
src/components/ai/AgentContextPanel.css:346:  display: grid;
src/components/ai/AgentContextPanel.css:347:  grid-template-columns: 40px minmax(0, 1fr) auto;
src/components/ai/AgentContextPanel.css:365:  height: 40px;
src/components/ai/AgentContextPanel.css:366:  display: grid;
src/components/ai/AgentContextPanel.css:419:  line-height: 1.35;
src/components/ai/AgentContextPanel.css:425:  height: 34px;
src/components/ai/AgentContextPanel.css:426:  display: grid;
src/components/ai/AgentContextPanel.css:435:.agent-focused-list-card {
src/components/ai/AgentContextPanel.css:460:  display: grid;
src/components/ai/AgentContextPanel.css:465:  display: grid;
src/components/ai/AgentContextPanel.css:466:  grid-template-columns: 30px minmax(0, 1fr) auto;
src/components/ai/AgentContextPanel.css:477:.agent-focused-row-icon {
src/components/ai/AgentContextPanel.css:479:  height: 30px;
src/components/ai/AgentContextPanel.css:485:.agent-focused-row-icon.is-blue { background: var(--agent-blue-soft); }
src/components/ai/AgentContextPanel.css:486:.agent-focused-row-icon.is-red { background: var(--agent-red-soft); }
src/components/ai/AgentContextPanel.css:487:.agent-focused-row-icon.is-orange { background: var(--agent-orange-soft); }
src/components/ai/AgentContextPanel.css:488:.agent-focused-row-icon.is-purple { background: var(--agent-purple-soft); }
src/components/ai/AgentContextPanel.css:489:.agent-focused-row-icon.is-teal { background: var(--agent-teal-soft); }
src/components/ai/AgentContextPanel.css:490:.agent-focused-row-icon.is-slate { background: #eef2f7; }
src/components/ai/AgentContextPanel.css:531:  line-height: 1.35;
src/components/ai/AgentContextPanel.css:543:  min-height: 36px;
src/components/ai/AgentContextPanel.css:572:  grid-template-columns: 30px minmax(0, 1fr) auto auto;
src/components/ai/AgentContextPanel.css:612:    height: 100%;
src/components/document-builder/document-builder-test.tsx:57:        "flex h-8 min-w-8 items-center justify-center rounded px-2 text-sm transition",
src/components/document-builder/document-builder-test.tsx:236:          "doc-editor-content min-h-[960px] w-[816px] max-w-full bg-white px-[76px] py-[72px] text-[15px] leading-7 text-slate-950 outline-none",
src/components/document-builder/document-builder-test.tsx:279:            body { font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6; }
src/components/document-builder/document-builder-test.tsx:297:    <div className="min-h-screen bg-slate-100 text-slate-950">
src/components/document-builder/document-builder-test.tsx:301:          line-height: 1.2;
src/components/document-builder/document-builder-test.tsx:308:          line-height: 1.3;
src/components/document-builder/document-builder-test.tsx:353:        <div className="flex h-14 items-center gap-3 px-4">
src/components/document-builder/document-builder-test.tsx:354:          <div className="flex h-9 w-9 items-center justify-center rounded bg-blue-600 text-sm font-bold text-white">
src/components/document-builder/document-builder-test.tsx:358:          <div className="min-w-0 flex-1">
src/components/document-builder/document-builder-test.tsx:362:              className="w-full max-w-md rounded px-2 py-1 text-lg font-medium outline-none hover:bg-slate-100 focus:bg-slate-100"
src/components/document-builder/document-builder-test.tsx:390:        <div className="flex h-12 items-center gap-1 overflow-x-auto border-t bg-slate-50 px-4">
src/components/document-builder/document-builder-test.tsx:436:      <div className="grid min-h-[calc(100vh-104px)] grid-cols-1">
src/components/document-builder/document-builder-test.tsx:437:        <main className="overflow-auto px-4 py-8">
src/components/document-builder/document-builder-test.tsx:438:          <div className="mx-auto w-fit">
src/components/document-builder/document-builder-test.tsx:439:            <div className="mb-2 h-6 w-[816px] max-w-full border-b border-slate-300 text-center text-[10px] text-slate-400">
src/components/document-builder/document-builder-test.tsx:443:            <div className="min-h-[960px] w-[816px] max-w-full bg-white shadow-xl ring-1 ring-slate-300">
src/components/document-builder/document-builder-test.tsx:455:          <div className="mt-4 grid gap-2">
src/components/document-builder/document-builder-test.tsx:480:                <input className="mt-1 w-full rounded border bg-white px-2 py-1.5" value={clientName} onChange={(e) => setClientName(e.target.value)} />
src/components/document-builder/document-builder-test.tsx:485:                <input className="mt-1 w-full rounded border bg-white px-2 py-1.5" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
src/components/document-builder/document-builder-test.tsx:490:                <input className="mt-1 w-full rounded border bg-white px-2 py-1.5" value={serviceName} onChange={(e) => setServiceName(e.target.value)} />
src/components/document-builder/document-builder-test.tsx:495:                <input className="mt-1 w-full rounded border bg-white px-2 py-1.5" value={amount} onChange={(e) => setAmount(e.target.value)} />
src/components/document-builder/document-builder-test.tsx:500:                <input className="mt-1 w-full rounded border bg-white px-2 py-1.5" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
src/components/document-builder/document-builder-test.tsx:508:              className="mt-2 max-h-72 overflow-auto rounded border bg-white p-3 text-xs"
src/components/document-builder/proposal-document-builder.tsx:354:    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-slate-100 text-slate-950">
src/components/document-builder/proposal-document-builder.tsx:359:        .proposal-tinymce-shell{height:100%!important;min-height:0!important}
src/components/document-builder/proposal-document-builder.tsx:360:        .proposal-tinymce-shell .tox{height:100%!important;min-height:0!important;border:0!important;border-radius:0!important;background:#e8edf3!important}
src/components/document-builder/proposal-document-builder.tsx:361:        .proposal-tinymce-shell .tox-editor-container{height:100%!important;min-height:0!important}
src/components/document-builder/proposal-document-builder.tsx:362:        .proposal-tinymce-shell .tox-sidebar-wrap{min-height:0!important}
src/components/document-builder/proposal-document-builder.tsx:370:        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-7">
src/components/document-builder/proposal-document-builder.tsx:376:              className="mt-1 h-9 w-full rounded-md border px-2 text-sm font-normal text-slate-900"
src/components/document-builder/proposal-document-builder.tsx:390:              className="mt-1 h-9 w-full rounded-md border px-2 text-sm font-normal text-slate-900"
src/components/document-builder/proposal-document-builder.tsx:405:              className="mt-1 h-9 w-full rounded-md border px-2 text-sm font-normal text-slate-900"
src/components/document-builder/proposal-document-builder.tsx:421:              className="mt-1 h-9"
src/components/document-builder/proposal-document-builder.tsx:429:              className="mt-1 h-9"
src/components/document-builder/proposal-document-builder.tsx:438:                className="h-9 w-20 rounded-md border px-2 text-sm font-normal"
src/components/document-builder/proposal-document-builder.tsx:444:              <Input value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9" />
src/components/document-builder/proposal-document-builder.tsx:448:            <Button className="h-9 w-full" disabled={saving} onClick={() => void save()}>
src/components/document-builder/proposal-document-builder.tsx:456:          className="mt-3 max-w-xl font-bold"
src/components/document-builder/proposal-document-builder.tsx:460:      <div className="min-h-0 flex-1 overflow-hidden bg-slate-100">
src/components/document-builder/proposal-document-builder.tsx:461:        <div className="proposal-tinymce-shell flex h-full min-h-0 flex-col">
src/components/document-builder/proposal-document-builder.tsx:471:              height: "100%",
src/components/document-builder/proposal-document-builder.tsx:491:                  min-height:100%;
src/components/document-builder/proposal-document-builder.tsx:496:                  min-height:1056px;
src/components/document-builder/proposal-document-builder.tsx:504:                  line-height:1.7;
src/components/document-builder/proposal-document-builder.tsx:507:                h1{font-size:30px;line-height:1.15;margin:0 0 22px;font-weight:800;color:#0f172a}
src/components/document-builder/proposal-document-builder.tsx:508:                h2{font-size:18px;line-height:1.25;margin:28px 0 10px;font-weight:800;color:#0f172a}
src/components/document-builder/proposal-document-builder.tsx:528:        <div className="mx-auto mt-3 max-w-[1060px] text-xs text-slate-500">
src/components/document-builder/document-builder-tinymce.tsx:208:      <div className="min-h-[calc(100vh-88px)] bg-slate-50 px-6 py-6">
src/components/document-builder/document-builder-tinymce.tsx:228:          <div className="grid h-64 place-items-center text-slate-500">
src/components/document-builder/document-builder-tinymce.tsx:229:            <Loader2 className="h-6 w-6 animate-spin" />
src/components/document-builder/document-builder-tinymce.tsx:232:          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
src/components/document-builder/document-builder-tinymce.tsx:237:              className="aspect-[4/5] rounded-2xl border-2 border-dashed border-slate-300 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md disabled:opacity-60"
src/components/document-builder/document-builder-tinymce.tsx:239:              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
src/components/document-builder/document-builder-tinymce.tsx:240:                <div className="grid h-14 w-14 place-items-center rounded-full bg-blue-50 text-blue-600">
src/components/document-builder/document-builder-tinymce.tsx:241:                  <Plus className="h-7 w-7" />
src/components/document-builder/document-builder-tinymce.tsx:255:                className="aspect-[4/5] overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
src/components/document-builder/document-builder-tinymce.tsx:257:                <div className="flex h-full flex-col">
src/components/document-builder/document-builder-tinymce.tsx:259:                    <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
src/components/document-builder/document-builder-tinymce.tsx:260:                      <FileText className="h-5 w-5" />
src/components/document-builder/document-builder-tinymce.tsx:287:    <div className="h-[calc(100vh-88px)] bg-white">
src/components/document-builder/document-builder-tinymce.tsx:288:      <div className="flex h-12 items-center gap-3 border-b bg-white px-4">
src/components/document-builder/document-builder-tinymce.tsx:292:          className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100"
src/components/document-builder/document-builder-tinymce.tsx:295:          <ArrowLeft className="h-5 w-5" />
src/components/document-builder/document-builder-tinymce.tsx:301:          className="min-w-0 flex-1 rounded-md px-2 py-1 text-base font-semibold outline-none hover:bg-slate-50 focus:bg-slate-50"
src/components/document-builder/document-builder-tinymce.tsx:310:          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
src/components/document-builder/document-builder-tinymce.tsx:324:          height: "calc(100vh - 136px)",
src/components/document-builder/document-builder-tinymce.tsx:325:          min_height: 760,
src/components/document-builder/document-builder-tinymce.tsx:329:          resize: false,
src/components/document-builder/document-builder-tinymce.tsx:346:              line-height: 1.6;
src/components/document-builder/document-builder-tinymce.tsx:348:              min-height: calc(100vh - 260px);
src/components/document-builder/document-builder-tinymce.tsx:356:              line-height: 1.2;
src/components/email/email-html-viewer.tsx:23:  const [height, setHeight] = useState<number>(600);
src/components/email/email-html-viewer.tsx:40:        line-height: 1.5;
src/components/email/email-html-viewer.tsx:41:        overflow-wrap: anywhere;
src/components/email/email-html-viewer.tsx:43:      img { max-width: 100%; height: auto; }
src/components/email/email-html-viewer.tsx:55:      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
src/components/email/email-html-viewer.tsx:58:      className="w-full border-0 rounded-md bg-white"
src/components/email/email-html-viewer.tsx:59:      style={{ minHeight: 500, height }}
src/components/whatsapp/whatsapp-contact-panel.tsx:19:} from "@/lib/whatsapp/view-types";
src/components/whatsapp/whatsapp-contact-panel.tsx:41:} from "@/lib/products/match-product-interest";
src/components/whatsapp/whatsapp-contact-panel.tsx:1594:      className={cn("h-full min-h-0 min-w-0 overflow-y-auto bg-[#f0f2f5] px-3.5 py-3.5", className)}
src/components/whatsapp/whatsapp-contact-panel.tsx:1596:      <div className="rounded-[18px] border border-black/5 bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
src/components/whatsapp/whatsapp-contact-panel.tsx:1597:        <div className="flex items-start gap-3 min-w-0">
src/components/whatsapp/whatsapp-contact-panel.tsx:1599:          <div className="min-w-0 flex-1">
src/components/whatsapp/whatsapp-contact-panel.tsx:1600:            <div className="flex flex-col gap-2 min-w-0">
src/components/whatsapp/whatsapp-contact-panel.tsx:1601:              <div className="min-w-0">
src/components/whatsapp/whatsapp-contact-panel.tsx:1608:                <span className="inline-flex items-center h-6 px-2.5 rounded-full border text-[11px] font-medium bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/15 dark:text-emerald-200 dark:border-emerald-800/40">
src/components/whatsapp/whatsapp-contact-panel.tsx:1612:                  <span className="inline-flex items-center h-6 px-2.5 rounded-full border text-[11px] font-medium bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/15 dark:text-blue-200 dark:border-blue-800/40">
src/components/whatsapp/whatsapp-contact-panel.tsx:1626:            className="rounded-[18px] border border-black/5 bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
src/components/whatsapp/whatsapp-contact-panel.tsx:1628:            <div className="w-full space-y-2">
src/components/whatsapp/whatsapp-contact-panel.tsx:1633:                <div className="inline-flex w-fit rounded-full border border-black/5 bg-slate-50 px-2.5 py-1 text-[10px] text-slate-500">
src/components/whatsapp/whatsapp-contact-panel.tsx:1640:              <p className="w-full text-[12px] leading-[1.45] text-slate-500">
src/components/whatsapp/whatsapp-contact-panel.tsx:1645:            <div className="mt-3 grid grid-cols-1 gap-2.5">
src/components/whatsapp/whatsapp-contact-panel.tsx:1651:                    "w-full rounded-[14px] border bg-white px-3 py-2.5 text-left transition hover:bg-muted/30",
src/components/whatsapp/whatsapp-contact-panel.tsx:1659:                    <div className="min-w-0">
src/components/whatsapp/whatsapp-contact-panel.tsx:1695:                  className="w-full justify-start gap-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm"
src/components/whatsapp/whatsapp-contact-panel.tsx:1699:                  <UserRound className="h-4 w-4 text-white" />
src/components/whatsapp/whatsapp-contact-panel.tsx:1705:            <div className="mt-2 grid grid-cols-1 gap-2">
src/components/whatsapp/whatsapp-contact-panel.tsx:1711:                  "w-full justify-start gap-2 min-w-0 overflow-hidden rounded-xl",
src/components/whatsapp/whatsapp-contact-panel.tsx:1725:                <BriefcaseBusiness className="h-4 w-4 text-white" />
src/components/whatsapp/whatsapp-contact-panel.tsx:1740:                  "w-full justify-start gap-2 min-w-0 overflow-hidden rounded-xl",
src/components/whatsapp/whatsapp-contact-panel.tsx:1754:                <UserRound className="h-4 w-4 text-white" />
src/components/whatsapp/whatsapp-contact-panel.tsx:1765:              <div className="grid grid-cols-2 gap-2">
src/components/whatsapp/whatsapp-contact-panel.tsx:1769:                  className="justify-start gap-2 min-w-0 overflow-hidden rounded-xl"
src/components/whatsapp/whatsapp-contact-panel.tsx:1773:                  <Copy className="h-4 w-4 text-muted-foreground" />
src/components/whatsapp/whatsapp-contact-panel.tsx:1779:                  className="justify-start gap-2 min-w-0 overflow-hidden rounded-xl"
src/components/whatsapp/whatsapp-contact-panel.tsx:1783:                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
src/components/whatsapp/whatsapp-contact-panel.tsx:1788:              <div className="grid grid-cols-2 gap-2">
src/components/whatsapp/whatsapp-contact-panel.tsx:1792:                  className="justify-start gap-2 min-w-0 overflow-hidden rounded-xl"
src/components/whatsapp/whatsapp-contact-panel.tsx:1796:                  <Eye className="h-4 w-4 text-muted-foreground" />
src/components/whatsapp/whatsapp-contact-panel.tsx:1802:                  className="justify-start gap-2 min-w-0 overflow-hidden rounded-xl"
src/components/whatsapp/whatsapp-contact-panel.tsx:1806:                  <Calendar className="h-4 w-4 text-muted-foreground" />
src/components/whatsapp/whatsapp-contact-panel.tsx:1815:                className="w-full justify-start gap-2 min-w-0 overflow-hidden rounded-xl"
src/components/whatsapp/whatsapp-contact-panel.tsx:1819:                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
src/components/whatsapp/whatsapp-contact-panel.tsx:1849:                          "w-full cursor-pointer text-left rounded-[12px] border bg-background p-3 text-[12px] transition",
src/components/whatsapp/whatsapp-contact-panel.tsx:1856:                          <div className="min-w-0">
src/components/whatsapp/whatsapp-contact-panel.tsx:1880:                            className="h-8 px-3 text-[11px] font-semibold"
src/components/whatsapp/whatsapp-contact-panel.tsx:1927:                    <SelectTrigger className="mt-1 h-9">
src/components/whatsapp/whatsapp-contact-panel.tsx:1995:                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
src/components/whatsapp/whatsapp-contact-panel.tsx:2000:                    className="justify-start min-w-0 overflow-hidden"
src/components/whatsapp/whatsapp-contact-panel.tsx:2004:                    <Copy className="h-4 w-4" />
src/components/whatsapp/whatsapp-contact-panel.tsx:2012:                    className="justify-start bg-emerald-600 hover:bg-emerald-700 min-w-0 overflow-hidden"
src/components/whatsapp/whatsapp-contact-panel.tsx:2032:                    className="justify-start w-full"
src/components/whatsapp/whatsapp-contact-panel.tsx:2046:                    <ExternalLink className="h-4 w-4" />
src/components/whatsapp/whatsapp-contact-panel.tsx:2106:                  className="h-7 px-2 text-[11px]"
src/components/whatsapp/whatsapp-contact-panel.tsx:2109:                  <Copy className="h-4 w-4" />
src/components/whatsapp/whatsapp-contact-panel.tsx:2117:                <div className="grid grid-cols-2 gap-2">
src/components/whatsapp/whatsapp-contact-panel.tsx:2176:                    className="h-7 px-2 text-[11px] justify-start"
src/components/whatsapp/whatsapp-contact-panel.tsx:2203:            <div className="grid grid-cols-2 gap-2">
src/components/whatsapp/whatsapp-contact-panel.tsx:2262:                  <SelectTrigger className="h-9">
src/components/whatsapp/whatsapp-contact-panel.tsx:2275:                  <UserCog className="h-3.5 w-3.5" />
src/components/whatsapp/whatsapp-contact-panel.tsx:2282:              <div className="grid grid-cols-2 gap-2">
src/components/whatsapp/whatsapp-contact-panel.tsx:2290:                  <Mail className="h-4 w-4" /> Email
src/components/whatsapp/whatsapp-contact-panel.tsx:2303:                  <Phone className="h-4 w-4" /> Llamar
src/components/whatsapp/whatsapp-contact-panel.tsx:2324:                          <div className="min-w-0">
src/components/whatsapp/whatsapp-contact-panel.tsx:2332:                            <span className="shrink-0 inline-flex items-center h-6 px-2 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-medium dark:bg-red-900/15 dark:text-red-200 dark:border-red-800/40">
src/components/whatsapp/whatsapp-contact-panel.tsx:2337:                        <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] text-muted-foreground">
src/components/whatsapp/whatsapp-contact-panel.tsx:2401:        <DialogContent className="max-w-xl">
src/components/whatsapp/whatsapp-contact-panel.tsx:2481:            <div className="grid grid-cols-2 gap-4">
src/components/whatsapp/WhatsAppInternalWorkPanel.tsx:46:  const section = button?.closest("section");
src/components/whatsapp/WhatsAppInternalWorkPanel.tsx:47:  return section?.parentElement || section || null;
src/components/whatsapp/WhatsAppInternalWorkPanel.tsx:265:    <section className="rounded-2xl border border-[#bcebd0] bg-[#f0fff6] p-3 shadow-sm">
src/components/whatsapp/WhatsAppInternalWorkPanel.tsx:267:        <div className="flex min-w-0 items-center gap-2 text-sm font-black text-[#12231d]">
src/components/whatsapp/WhatsAppInternalWorkPanel.tsx:268:          {mode === "task" ? <Clock3 className="h-4 w-4 shrink-0 text-[#008069]" /> : <StickyNote className="h-4 w-4 shrink-0 text-[#008069]" />}
src/components/whatsapp/WhatsAppInternalWorkPanel.tsx:271:        <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-xl border border-[#cfe2d9] bg-white text-[#52645d] hover:bg-[#f7fbf9]" title="Cerrar" disabled={saving}>
src/components/whatsapp/WhatsAppInternalWorkPanel.tsx:272:          <X className="h-4 w-4" />
src/components/whatsapp/WhatsAppInternalWorkPanel.tsx:283:              <div className="flex items-center justify-between gap-2"><p className="truncate text-xs font-bold text-[#12231d]">{task.title}</p><CheckCircle2 className="h-4 w-4 shrink-0 text-[#00a884]" /></div>
src/components/whatsapp/WhatsAppInternalWorkPanel.tsx:294:              <div className="flex items-start justify-between gap-2"><p className="line-clamp-2 text-xs font-bold text-[#12231d]">{item.body}</p><CheckCircle2 className="h-4 w-4 shrink-0 text-[#00a884]" /></div>
src/components/whatsapp/WhatsAppInternalWorkPanel.tsx:303:          <Input autoFocus value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Título de la tarea" className="h-9 rounded-xl border-[#dce8e2] bg-white text-sm" />
src/components/whatsapp/WhatsAppInternalWorkPanel.tsx:304:          <Textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Descripción opcional" rows={2} className="min-h-[58px] rounded-xl border-[#dce8e2] bg-white text-sm" />
src/components/whatsapp/WhatsAppInternalWorkPanel.tsx:305:          <div className="grid grid-cols-2 gap-2">
src/components/whatsapp/WhatsAppInternalWorkPanel.tsx:306:            <Input type="date" value={form.due_date} onChange={(event) => setForm((prev) => ({ ...prev, due_date: event.target.value }))} className="h-9 rounded-xl border-[#dce8e2] bg-white text-xs" />
src/components/whatsapp/WhatsAppInternalWorkPanel.tsx:308:              <SelectTrigger className="h-9 rounded-xl border-[#dce8e2] bg-white text-xs"><SelectValue /></SelectTrigger>
src/components/whatsapp/WhatsAppInternalWorkPanel.tsx:312:          <div className="flex gap-2 pt-1"><Button type="button" variant="outline" size="sm" className="h-9 flex-1 rounded-xl" onClick={() => setOpen(false)} disabled={saving}>Cerrar</Button><Button type="submit" size="sm" className="h-9 flex-1 rounded-xl bg-[#00a884] hover:bg-[#008f72]" disabled={saving || !form.title.trim()}><Save className="mr-1.5 h-3.5 w-3.5" /> {saving ? "..." : "Guardar"}</Button></div>
src/components/whatsapp/WhatsAppInternalWorkPanel.tsx:316:          <Textarea autoFocus value={note} onChange={(event) => setNote(event.target.value)} placeholder="Escribe una nota para el equipo..." rows={4} className="min-h-[92px] rounded-xl border-[#dce8e2] bg-white text-sm" />
src/components/whatsapp/WhatsAppInternalWorkPanel.tsx:317:          <div className="flex gap-2 pt-1"><Button type="button" variant="outline" size="sm" className="h-9 flex-1 rounded-xl" onClick={() => setOpen(false)} disabled={saving}>Cerrar</Button><Button type="submit" size="sm" className="h-9 flex-1 rounded-xl bg-[#00a884] hover:bg-[#008f72]" disabled={saving || !note.trim()}><Save className="mr-1.5 h-3.5 w-3.5" /> {saving ? "..." : "Guardar nota"}</Button></div>
src/components/whatsapp/WhatsAppInternalWorkPanel.tsx:320:    </section>,
src/components/whatsapp/whatsapp-avatar.tsx:33:        "rounded-full grid place-items-center bg-emerald-100 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-300 font-semibold overflow-hidden shrink-0",
src/components/whatsapp/whatsapp-avatar.tsx:36:      style={{ width: size, height: size, fontSize: Math.max(11, Math.floor(size * 0.32)) }}
src/components/whatsapp/whatsapp-avatar.tsx:46:          className="h-full w-full object-cover"
src/components/whatsapp/whatsapp-readonly-list.tsx:4:import type { CrmWhatsappConversationListRow } from "@/lib/whatsapp/view-types";
src/components/whatsapp/whatsapp-readonly-list.tsx:41:        "inline-flex items-center h-4.5 px-1.5 rounded-full border text-[9.5px] font-medium whitespace-nowrap",
src/components/whatsapp/whatsapp-readonly-list.tsx:144:        "h-full min-h-0 w-[350px] max-[1450px]:w-[340px] max-[1180px]:w-[300px] max-[820px]:w-[82px] border-r border-black/10 bg-white min-w-0 overflow-hidden flex flex-col",
src/components/whatsapp/whatsapp-readonly-list.tsx:153:          <span className="min-w-6 h-5 px-2 rounded-full bg-white/80 text-slate-600 text-[11px] grid place-items-center font-semibold border border-black/5">
src/components/whatsapp/whatsapp-readonly-list.tsx:157:        <div className="grid grid-cols-4 gap-1 max-[820px]:hidden">
src/components/whatsapp/whatsapp-readonly-list.tsx:171:                "h-8 rounded-full border text-[11px] font-medium transition-colors",
src/components/whatsapp/whatsapp-readonly-list.tsx:182:          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
src/components/whatsapp/whatsapp-readonly-list.tsx:184:            className="w-full h-[38px] rounded-full border-0 bg-white pl-9 pr-3 text-[13px] text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/30 shadow-sm placeholder:text-slate-400"
src/components/whatsapp/whatsapp-readonly-list.tsx:194:            className="h-[34px] w-full rounded-full bg-white px-3.5 text-[12px] font-medium text-slate-700 shadow-sm border border-black/5 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors"
src/components/whatsapp/whatsapp-readonly-list.tsx:196:            <span className="inline-flex items-center gap-2 min-w-0">
src/components/whatsapp/whatsapp-readonly-list.tsx:197:              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
src/components/whatsapp/whatsapp-readonly-list.tsx:203:                "h-4 w-4 text-slate-400 transition-transform",
src/components/whatsapp/whatsapp-readonly-list.tsx:210:            <div className="absolute left-0 right-0 top-[40px] z-30 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.14)]">
src/components/whatsapp/whatsapp-readonly-list.tsx:221:                      "w-full h-9 rounded-xl px-3 text-left text-[12px] font-medium transition-colors flex items-center justify-between",
src/components/whatsapp/whatsapp-readonly-list.tsx:229:                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
src/components/whatsapp/whatsapp-readonly-list.tsx:239:      <div className="flex-1 min-h-0 overflow-y-auto p-0 bg-white">
src/components/whatsapp/whatsapp-readonly-list.tsx:273:                    "relative block w-full text-left rounded-none px-3.5 py-3.5 transition-colors hover:bg-[#f5f6f6] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 border-b border-black/[0.06]",
src/components/whatsapp/whatsapp-readonly-list.tsx:280:                      "absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full transition-colors",
src/components/whatsapp/whatsapp-readonly-list.tsx:288:                        <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-card bg-amber-500 grid place-items-center">
src/components/whatsapp/whatsapp-readonly-list.tsx:289:                          <UserRound className="h-2.5 w-2.5 text-white" />
src/components/whatsapp/whatsapp-readonly-list.tsx:293:                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full border-2 border-card bg-slate-500 grid place-items-center">
src/components/whatsapp/whatsapp-readonly-list.tsx:294:                          <Bot className="h-2.5 w-2.5 text-white" />
src/components/whatsapp/whatsapp-readonly-list.tsx:298:                        <span className="absolute -top-1 -left-1 h-4 min-w-4 px-1 rounded-full border-2 border-card bg-emerald-500 text-white text-[10px] font-semibold grid place-items-center max-[820px]:hidden">
src/components/whatsapp/whatsapp-readonly-list.tsx:303:                        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-card hidden max-[820px]:block" />
src/components/whatsapp/whatsapp-readonly-list.tsx:307:                    <div className="min-w-0 flex-1 max-[820px]:hidden">
src/components/whatsapp/whatsapp-readonly-list.tsx:308:                      <div className="flex items-start justify-between gap-2 min-w-0">
src/components/whatsapp/whatsapp-readonly-list.tsx:309:                        <div className="min-w-0">
src/components/whatsapp/contact-panel.tsx:85:    <div className="w-72 border-l bg-card shrink-0 hidden xl:flex xl:flex-col">
src/components/whatsapp/contact-panel.tsx:90:            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 text-xl font-semibold mx-auto mb-2">
src/components/whatsapp/contact-panel.tsx:116:                <SelectTrigger className="h-8 text-xs mt-1">
src/components/whatsapp/contact-panel.tsx:133:                <SelectTrigger className="h-8 text-xs mt-1">
src/components/whatsapp/contact-panel.tsx:158:                className="h-5 w-5 p-0"
src/components/whatsapp/contact-panel.tsx:161:                <Plus className="h-3 w-3" />
src/components/whatsapp/contact-panel.tsx:169:                    <X className="h-2.5 w-2.5" />
src/components/whatsapp/contact-panel.tsx:180:                  className="h-7 text-xs"
src/components/whatsapp/contact-panel.tsx:187:                <Button size="sm" className="h-7 text-xs px-2" onClick={handleAddTag}>
src/components/whatsapp/contact-panel.tsx:200:              className="flex items-center justify-between w-full mb-2"
src/components/whatsapp/contact-panel.tsx:206:                <ChevronUp className="h-3 w-3 text-muted-foreground" />
src/components/whatsapp/contact-panel.tsx:208:                <ChevronDown className="h-3 w-3 text-muted-foreground" />
src/components/whatsapp/contact-panel.tsx:215:                    <Mail className="h-3 w-3 shrink-0" />
src/components/whatsapp/contact-panel.tsx:220:                  <Phone className="h-3 w-3 shrink-0" />
src/components/whatsapp/contact-panel.tsx:225:                    <Building2 className="h-3 w-3 shrink-0 text-muted-foreground" />
src/components/whatsapp/contact-panel.tsx:231:                    <UserPlus className="h-3 w-3 shrink-0 text-muted-foreground" />
src/components/whatsapp/contact-panel.tsx:248:              className="flex items-center justify-between w-full mb-2"
src/components/whatsapp/contact-panel.tsx:254:                <ChevronUp className="h-3 w-3 text-muted-foreground" />
src/components/whatsapp/contact-panel.tsx:256:                <ChevronDown className="h-3 w-3 text-muted-foreground" />
src/components/whatsapp/contact-panel.tsx:264:                  className="w-full text-xs gap-1.5 h-8 justify-start"
src/components/whatsapp/contact-panel.tsx:267:                  <UserPlus className="h-3.5 w-3.5" /> Create Lead
src/components/whatsapp/contact-panel.tsx:272:                  className="w-full text-xs gap-1.5 h-8 justify-start"
src/components/whatsapp/contact-panel.tsx:275:                  <Link2 className="h-3.5 w-3.5" /> Link to Client
src/components/whatsapp/contact-panel.tsx:280:                  className="w-full text-xs gap-1.5 h-8 justify-start"
src/components/whatsapp/contact-panel.tsx:283:                  <ClipboardList className="h-3.5 w-3.5" /> Create Task
src/components/whatsapp/whatsapp-readonly-thread.tsx:4:import type { CrmWhatsappMessageRow } from "@/lib/whatsapp/view-types";
src/components/whatsapp/whatsapp-readonly-thread.tsx:84:    sent: <Check className="h-3 w-3 text-muted-foreground" />,
src/components/whatsapp/whatsapp-readonly-thread.tsx:85:    delivered: <CheckCheck className="h-3 w-3 text-muted-foreground" />,
src/components/whatsapp/whatsapp-readonly-thread.tsx:86:    read: <CheckCheck className="h-3 w-3 text-primary" />,
src/components/whatsapp/whatsapp-readonly-thread.tsx:87:    failed: <Clock className="h-3 w-3 text-destructive" />,
src/components/whatsapp/whatsapp-readonly-thread.tsx:91:    <section
src/components/whatsapp/whatsapp-readonly-thread.tsx:94:        "h-full min-h-0 min-w-0 flex flex-col overflow-hidden bg-[#efeae2] border-r border-black/10",
src/components/whatsapp/whatsapp-readonly-thread.tsx:98:      <header className="shrink-0 h-[60px] bg-[#f0f2f5] border-b border-black/10 flex items-center justify-between px-4.5 gap-3 min-w-0 sticky top-0 z-10">
src/components/whatsapp/whatsapp-readonly-thread.tsx:99:        <div className="flex items-center gap-2.5 min-w-0">
src/components/whatsapp/whatsapp-readonly-thread.tsx:101:          <div className="min-w-0">
src/components/whatsapp/whatsapp-readonly-thread.tsx:102:            <div className="flex items-center gap-2 min-w-0">
src/components/whatsapp/whatsapp-readonly-thread.tsx:107:                <WhatsappStatusBadge status={status} className="h-[22px] px-2 text-[10px]" />
src/components/whatsapp/whatsapp-readonly-thread.tsx:112:                <Phone className="h-3.5 w-3.5" />
src/components/whatsapp/whatsapp-readonly-thread.tsx:117:                    "inline-flex items-center gap-1 rounded-full border px-2 h-5 text-[10px] font-medium",
src/components/whatsapp/whatsapp-readonly-thread.tsx:123:                  <Bot className="h-3 w-3" />
src/components/whatsapp/whatsapp-readonly-thread.tsx:131:          <button className="h-9 w-9 rounded-full border-0 bg-transparent grid place-items-center text-slate-500 hover:bg-black/5">
src/components/whatsapp/whatsapp-readonly-thread.tsx:132:            <MoreHorizontal className="h-4 w-4" />
src/components/whatsapp/whatsapp-readonly-thread.tsx:137:      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-5 sm:px-8 bg-[#efeae2] relative before:absolute before:inset-0 before:pointer-events-none before:opacity-[0.38] before:bg-[radial-gradient(circle_at_12px_12px,rgba(120,113,108,0.22)_1.2px,transparent_1.3px),radial-gradient(circle_at_32px_28px,rgba(120,113,108,0.16)_1px,transparent_1.2px),linear-gradient(45deg,transparent_0_46%,rgba(120,113,108,0.12)_46%_47%,transparent_47%_100%)] before:[background-size:48px_48px,56px_56px,72px_72px]">
src/components/whatsapp/whatsapp-readonly-thread.tsx:138:        <div className="relative z-10 h-full">
src/components/whatsapp/whatsapp-readonly-thread.tsx:146:            <div className="max-w-[860px] mx-auto">
src/components/whatsapp/whatsapp-readonly-thread.tsx:150:                    <span className="h-6 inline-flex items-center text-[11px] text-slate-500 bg-white/80 border border-black/5 rounded-full px-3 shadow-sm">
src/components/whatsapp/whatsapp-readonly-thread.tsx:166:                        <div className="max-w-[min(560px,76%)]">
src/components/whatsapp/whatsapp-readonly-thread.tsx:169:                              "relative rounded-[9px] px-3.5 py-2.5 pb-5 text-[13.5px] leading-[1.38] tracking-[-0.012em] shadow-[0_1px_1px_rgba(0,0,0,0.10)]",
src/components/whatsapp/whatsapp-readonly-thread.tsx:194:        <div className="max-w-[860px] mx-auto flex items-end gap-2">
src/components/whatsapp/whatsapp-readonly-thread.tsx:195:          <div className="flex-1 min-w-0 space-y-2">
src/components/whatsapp/whatsapp-readonly-thread.tsx:198:                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] text-emerald-800 w-fit shadow-sm"
src/components/whatsapp/whatsapp-readonly-thread.tsx:211:                className="flex-1 min-h-11 max-h-28 resize-none rounded-full border-0 bg-white px-4.5 py-3 text-[13.5px] leading-[1.25] outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:bg-white/60 shadow-sm placeholder:text-slate-400"
src/components/whatsapp/whatsapp-readonly-thread.tsx:239:                  "h-11 w-11 rounded-full bg-emerald-500 text-white grid place-items-center transition-colors hover:bg-emerald-600 shadow-sm",
src/components/whatsapp/whatsapp-readonly-thread.tsx:278:                  <SendHorizontal className="h-4 w-4" />
src/components/whatsapp/whatsapp-readonly-thread.tsx:286:            className="mt-2 max-w-[860px] mx-auto text-[11px] text-destructive truncate"
src/components/whatsapp/whatsapp-readonly-thread.tsx:293:    </section>
src/components/whatsapp/instagram-readonly-thread.tsx:4:import type { MetaMessageRow } from "@/lib/meta/view-types";
src/components/whatsapp/instagram-readonly-thread.tsx:67:    <section
src/components/whatsapp/instagram-readonly-thread.tsx:70:        "h-full min-h-0 min-w-0 flex flex-col overflow-hidden bg-[#efeae2] border-r border-black/10",
src/components/whatsapp/instagram-readonly-thread.tsx:74:      <header className="shrink-0 h-[60px] bg-[#f0f2f5] border-b border-black/10 flex items-center justify-between px-4.5 gap-3 min-w-0 sticky top-0 z-10">
src/components/whatsapp/instagram-readonly-thread.tsx:75:        <div className="flex items-center gap-2.5 min-w-0">
src/components/whatsapp/instagram-readonly-thread.tsx:77:          <div className="min-w-0">
src/components/whatsapp/instagram-readonly-thread.tsx:78:            <div className="flex items-center gap-2 min-w-0">
src/components/whatsapp/instagram-readonly-thread.tsx:82:              <span className="inline-flex items-center h-[22px] px-2 rounded-full border text-[10px] font-medium bg-pink-50 text-pink-700 border-pink-200">
src/components/whatsapp/instagram-readonly-thread.tsx:88:                <Instagram className="h-3.5 w-3.5" />
src/components/whatsapp/instagram-readonly-thread.tsx:102:      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-5 sm:px-8 bg-[#efeae2] relative before:absolute before:inset-0 before:pointer-events-none before:opacity-[0.38] before:bg-[radial-gradient(circle_at_12px_12px,rgba(120,113,108,0.22)_1.2px,transparent_1.3px),radial-gradient(circle_at_32px_28px,rgba(120,113,108,0.16)_1px,transparent_1.2px),linear-gradient(45deg,transparent_0_46%,rgba(120,113,108,0.12)_46%_47%,transparent_47%_100%)] before:[background-size:48px_48px,56px_56px,72px_72px]">
src/components/whatsapp/instagram-readonly-thread.tsx:103:        <div className="relative z-10 h-full">
src/components/whatsapp/instagram-readonly-thread.tsx:115:            <div className="max-w-[860px] mx-auto">
src/components/whatsapp/instagram-readonly-thread.tsx:119:                    <span className="h-6 inline-flex items-center text-[11px] text-slate-500 bg-white/80 border border-black/5 rounded-full px-3 shadow-sm">
src/components/whatsapp/instagram-readonly-thread.tsx:134:                        <div className="max-w-[min(560px,76%)]">
src/components/whatsapp/instagram-readonly-thread.tsx:137:                              "relative rounded-[9px] px-3.5 py-2.5 pb-6 text-[13.5px] leading-[1.38] tracking-[-0.012em] shadow-[0_1px_1px_rgba(0,0,0,0.10)]",
src/components/whatsapp/instagram-readonly-thread.tsx:148:                                <Paperclip className="h-3 w-3" />
src/components/whatsapp/instagram-readonly-thread.tsx:171:        <div className="max-w-[860px] mx-auto space-y-2">
src/components/whatsapp/instagram-readonly-thread.tsx:177:              className="flex-1 min-h-11 max-h-28 resize-none rounded-full border-0 bg-white px-4.5 py-3 text-[13.5px] leading-[1.25] outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:bg-white/60 shadow-sm placeholder:text-slate-400"
src/components/whatsapp/instagram-readonly-thread.tsx:185:              className="h-11 w-11 rounded-full bg-emerald-500 text-white grid place-items-center opacity-50 cursor-not-allowed shadow-sm"
src/components/whatsapp/instagram-readonly-thread.tsx:194:    </section>
src/components/whatsapp/WhatsAppPanelPhase2.tsx:17:function getWhatsappGrid() {
src/components/whatsapp/WhatsAppPanelPhase2.tsx:18:  return document.querySelector<HTMLElement>('div[class*="grid-cols-[76px_390px"]');
src/components/whatsapp/WhatsAppPanelPhase2.tsx:37:    [data-corevix-wa-grid="true"] {
src/components/whatsapp/WhatsAppPanelPhase2.tsx:42:      overflow-x: hidden !important;
src/components/whatsapp/WhatsAppPanelPhase2.tsx:46:    [data-corevix-wa-panel="true"] section,
src/components/whatsapp/WhatsAppPanelPhase2.tsx:47:    [data-corevix-wa-panel="true"] [data-corevix-wa-title-card="true"] {
src/components/whatsapp/WhatsAppPanelPhase2.tsx:52:    [data-corevix-wa-panel="true"] section {
src/components/whatsapp/WhatsAppPanelPhase2.tsx:59:      height: 42px !important;
src/components/whatsapp/WhatsAppPanelPhase2.tsx:76:      height: 42px !important;
src/components/whatsapp/WhatsAppPanelPhase2.tsx:98:      line-height: 1;
src/components/whatsapp/WhatsAppPanelPhase2.tsx:102:      display: grid !important;
src/components/whatsapp/WhatsAppPanelPhase2.tsx:103:      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
src/components/whatsapp/WhatsAppPanelPhase2.tsx:119:      [data-corevix-wa-grid="true"] {
src/components/whatsapp/WhatsAppPanelPhase2.tsx:120:        grid-template-columns: 72px minmax(340px, 390px) minmax(0, 1fr) minmax(320px, 340px) !important;
src/components/whatsapp/WhatsAppPanelPhase2.tsx:125:      [data-corevix-wa-grid="true"] {
src/components/whatsapp/WhatsAppPanelPhase2.tsx:126:        grid-template-columns: 66px minmax(330px, 360px) minmax(0, 1fr) 300px !important;
src/components/whatsapp/WhatsAppPanelPhase2.tsx:145:  button.classList.remove("grid", "place-items-center", "w-10", "h-10", "w-9", "h-9");
src/components/whatsapp/WhatsAppPanelPhase2.tsx:160:function getSectionTitle(section: HTMLElement) {
src/components/whatsapp/WhatsAppPanelPhase2.tsx:161:  return section.querySelector("p")?.textContent?.trim().toLowerCase() || "";
src/components/whatsapp/WhatsAppPanelPhase2.tsx:165:  return Array.from(aside.querySelectorAll<HTMLElement>("section")).find((section) => {
src/components/whatsapp/WhatsAppPanelPhase2.tsx:166:    const title = getSectionTitle(section);
src/components/whatsapp/WhatsAppPanelPhase2.tsx:167:    return title === "actividad" || section.textContent?.includes("Último mensaje:") || section.textContent?.includes("Última interacción:");
src/components/whatsapp/WhatsAppPanelPhase2.tsx:173:  const internalSection = taskButton?.closest("section") as HTMLElement | null;
src/components/whatsapp/WhatsAppPanelPhase2.tsx:201:  const card = nextButton.closest("section") as HTMLElement | null;
src/components/whatsapp/WhatsAppPanelPhase2.tsx:202:  if (!card) return;
src/components/whatsapp/WhatsAppPanelPhase2.tsx:203:  card.style.overflow = "hidden";
src/components/whatsapp/WhatsAppPanelPhase2.tsx:204:  card.style.cursor = "pointer";
src/components/whatsapp/WhatsAppPanelPhase2.tsx:208:    row.style.display = "grid";
src/components/whatsapp/WhatsAppPanelPhase2.tsx:209:    row.style.gridTemplateColumns = "minmax(0, 1fr)";
src/components/whatsapp/WhatsAppPanelPhase2.tsx:213:  if (card.dataset.corevixWaClickReady !== "true") {
src/components/whatsapp/WhatsAppPanelPhase2.tsx:214:    card.dataset.corevixWaClickReady = "true";
src/components/whatsapp/WhatsAppPanelPhase2.tsx:215:    card.addEventListener("click", (event) => {
src/components/whatsapp/WhatsAppPanelPhase2.tsx:242:  const section = taskButton?.closest("section") as HTMLElement | null;
src/components/whatsapp/WhatsAppPanelPhase2.tsx:243:  if (section && !section.previousElementSibling?.hasAttribute("data-corevix-wa-title-card")) {
src/components/whatsapp/WhatsAppPanelPhase2.tsx:246:    title.className = "rounded-2xl border border-[#dce8e2] bg-white px-3 py-2 shadow-sm";
src/components/whatsapp/WhatsAppPanelPhase2.tsx:248:    section.insertAdjacentElement("beforebegin", title);
src/components/whatsapp/WhatsAppPanelPhase2.tsx:257:  const grid = getWhatsappGrid();
src/components/whatsapp/WhatsAppPanelPhase2.tsx:258:  if (grid) grid.dataset.corevixWaGrid = "true";
src/components/whatsapp/WhatsAppPanelPhase2.tsx:275:    window.addEventListener("resize", enhancePanel);
src/components/whatsapp/WhatsAppPanelPhase2.tsx:278:      window.removeEventListener("resize", enhancePanel);
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:27:function getWhatsappGrid() {
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:28:  return document.querySelector<HTMLElement>('div[class*="grid-cols-[76px_390px"]');
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:39:      overflow-x: hidden !important;
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:42:    [data-corevix-whatsapp-panel="true"] section,
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:43:    [data-corevix-whatsapp-panel="true"] [data-corevix-section-title] {
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:56:      display: grid !important;
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:57:      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:86:      [data-corevix-whatsapp-grid="true"] {
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:87:        grid-template-columns: 58px minmax(280px, 340px) minmax(0, 1fr) !important;
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:92:      [data-corevix-whatsapp-grid="true"] {
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:93:        grid-template-columns: 1fr !important;
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:101:  const grid = getWhatsappGrid();
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:102:  if (grid) {
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:103:    grid.dataset.corevixWhatsappGrid = "true";
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:106:      grid.style.gridTemplateColumns = "72px minmax(340px, 390px) minmax(0, 1fr) minmax(320px, 340px)";
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:108:      grid.style.gridTemplateColumns = "66px minmax(330px, 360px) minmax(0, 1fr) 300px";
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:110:      grid.style.gridTemplateColumns = "58px minmax(300px, 340px) minmax(0, 1fr)";
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:126:  element.classList.remove("grid", "place-items-center", "w-10", "h-10", "w-9", "h-9", "min-w-fit");
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:131:  element.style.height = variant === "primary" ? "42px" : "40px";
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:166:  if (parent.querySelector(`[data-corevix-section-title="${key}"]`)) return;
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:170:  header.className = "mb-2 rounded-2xl border border-[#dce8e2] bg-white px-3 py-2 shadow-sm";
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:187:  const card = nextButton.closest("section") as HTMLElement | null;
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:188:  if (!card) return;
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:190:  card.dataset.corevixNextActionEnhanced = "true";
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:191:  card.classList.add("cursor-pointer", "transition", "hover:shadow-md");
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:192:  card.style.overflow = "hidden";
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:196:    headerRow.style.display = "grid";
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:197:    headerRow.style.gridTemplateColumns = "minmax(0, 1fr)";
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:202:  if (card.dataset.corevixNextActionClick !== "true") {
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:203:    card.dataset.corevixNextActionClick = "true";
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:204:    card.addEventListener("click", (event) => {
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:229:  return Array.from(aside.querySelectorAll<HTMLElement>("section")).find((section) => {
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:230:    const title = section.querySelector("p")?.textContent?.trim().toLowerCase() || "";
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:231:    return title === "actividad" || section.textContent?.includes("Último mensaje:") || section.textContent?.includes("Última interacción:");
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:262:  const internalSection = taskButton?.closest("section") as HTMLElement | null;
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:293:    window.addEventListener("resize", enhancePanel);
src/components/whatsapp/WhatsAppPanelLabelsEnhancer.tsx:296:      window.removeEventListener("resize", enhancePanel);
src/components/whatsapp/whatsapp-empty-state.tsx:12:      <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
src/components/whatsapp/whatsapp-empty-state.tsx:13:        <MessageSquare className="h-7 w-7" />
src/components/whatsapp/whatsapp-status-badge.tsx:42:        "h-6 inline-flex items-center gap-1.5 px-2.5 rounded-full text-[11px] font-semibold border whitespace-nowrap",
src/components/whatsapp/messenger-readonly-list.tsx:4:import type { MetaConversationListRow } from "@/lib/meta/view-types";
src/components/whatsapp/messenger-readonly-list.tsx:57:        "h-full min-h-0 w-[350px] max-[1450px]:w-[340px] max-[1180px]:w-[300px] max-[820px]:w-[82px] border-r border-black/10 bg-white min-w-0 overflow-hidden flex flex-col",
src/components/whatsapp/messenger-readonly-list.tsx:66:          <span className="min-w-6 h-5 px-2 rounded-full bg-white/80 text-slate-600 text-[11px] grid place-items-center font-semibold border border-black/5">
src/components/whatsapp/messenger-readonly-list.tsx:70:        <div className="grid grid-cols-4 gap-1 max-[820px]:hidden">
src/components/whatsapp/messenger-readonly-list.tsx:84:                "h-8 rounded-full border text-[11px] font-medium transition-colors",
src/components/whatsapp/messenger-readonly-list.tsx:95:          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600 shadow-sm max-[820px]:hidden space-y-0.5">
src/components/whatsapp/messenger-readonly-list.tsx:101:          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
src/components/whatsapp/messenger-readonly-list.tsx:103:            className="w-full h-[38px] rounded-full border-0 bg-white pl-9 pr-3 text-[13px] text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/30 shadow-sm placeholder:text-slate-400"
src/components/whatsapp/messenger-readonly-list.tsx:113:            className="h-[34px] w-full rounded-full bg-white px-3.5 text-[12px] font-medium text-slate-700 shadow-sm border border-black/5 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors"
src/components/whatsapp/messenger-readonly-list.tsx:115:            <span className="inline-flex items-center gap-2 min-w-0">
src/components/whatsapp/messenger-readonly-list.tsx:116:              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
src/components/whatsapp/messenger-readonly-list.tsx:122:                "h-4 w-4 text-slate-400 transition-transform",
src/components/whatsapp/messenger-readonly-list.tsx:130:      <div className="flex-1 min-h-0 overflow-y-auto p-0 bg-white">
src/components/whatsapp/messenger-readonly-list.tsx:159:                    "relative block w-full text-left rounded-none px-3.5 py-3.5 transition-colors hover:bg-[#f5f6f6] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 border-b border-black/[0.06]",
src/components/whatsapp/messenger-readonly-list.tsx:166:                      "absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full transition-colors",
src/components/whatsapp/messenger-readonly-list.tsx:174:                        <span className="absolute -top-1 -left-1 h-4 min-w-4 px-1 rounded-full border-2 border-card bg-emerald-500 text-white text-[10px] font-semibold grid place-items-center max-[820px]:hidden">
src/components/whatsapp/messenger-readonly-list.tsx:179:                        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-card hidden max-[820px]:block" />
src/components/whatsapp/messenger-readonly-list.tsx:183:                    <div className="min-w-0 flex-1 max-[820px]:hidden">
src/components/whatsapp/messenger-readonly-list.tsx:184:                      <div className="flex items-start justify-between gap-2 min-w-0">
src/components/whatsapp/messenger-readonly-list.tsx:185:                        <div className="min-w-0">
src/components/whatsapp/messenger-readonly-list.tsx:190:                            <MessageCircle className="h-3 w-3" />
src/components/whatsapp/messenger-readonly-list.tsx:202:                        <span className="inline-flex items-center h-4.5 px-1.5 rounded-full border text-[9.5px] font-medium whitespace-nowrap bg-blue-50 text-blue-700 border-blue-200">
src/components/whatsapp/messenger-readonly-list.tsx:206:                          <span className="inline-flex items-center h-4.5 px-1.5 rounded-full border text-[9.5px] font-medium whitespace-nowrap bg-muted/40 text-foreground/80 border-border/50">
src/components/whatsapp/instagram-readonly-list.tsx:4:import type { MetaConversationListRow } from "@/lib/meta/view-types";
src/components/whatsapp/instagram-readonly-list.tsx:55:        "h-full min-h-0 w-[350px] max-[1450px]:w-[340px] max-[1180px]:w-[300px] max-[820px]:w-[82px] border-r border-black/10 bg-white min-w-0 overflow-hidden flex flex-col",
src/components/whatsapp/instagram-readonly-list.tsx:64:          <span className="min-w-6 h-5 px-2 rounded-full bg-white/80 text-slate-600 text-[11px] grid place-items-center font-semibold border border-black/5">
src/components/whatsapp/instagram-readonly-list.tsx:69:        <div className="grid grid-cols-4 gap-1 max-[820px]:hidden">
src/components/whatsapp/instagram-readonly-list.tsx:83:                "h-8 rounded-full border text-[11px] font-medium transition-colors",
src/components/whatsapp/instagram-readonly-list.tsx:95:          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
src/components/whatsapp/instagram-readonly-list.tsx:97:            className="w-full h-[38px] rounded-full border-0 bg-white pl-9 pr-3 text-[13px] text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/30 shadow-sm placeholder:text-slate-400"
src/components/whatsapp/instagram-readonly-list.tsx:108:            className="h-[34px] w-full rounded-full bg-white px-3.5 text-[12px] font-medium text-slate-700 shadow-sm border border-black/5 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors"
src/components/whatsapp/instagram-readonly-list.tsx:110:            <span className="inline-flex items-center gap-2 min-w-0">
src/components/whatsapp/instagram-readonly-list.tsx:111:              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
src/components/whatsapp/instagram-readonly-list.tsx:117:                "h-4 w-4 text-slate-400 transition-transform",
src/components/whatsapp/instagram-readonly-list.tsx:125:      <div className="flex-1 min-h-0 overflow-y-auto p-0 bg-white">
src/components/whatsapp/instagram-readonly-list.tsx:153:                    "relative block w-full text-left rounded-none px-3.5 py-3.5 transition-colors hover:bg-[#f5f6f6] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 border-b border-black/[0.06]",
src/components/whatsapp/instagram-readonly-list.tsx:160:                      "absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full transition-colors",
src/components/whatsapp/instagram-readonly-list.tsx:168:                        <span className="absolute -top-1 -left-1 h-4 min-w-4 px-1 rounded-full border-2 border-card bg-emerald-500 text-white text-[10px] font-semibold grid place-items-center max-[820px]:hidden">
src/components/whatsapp/instagram-readonly-list.tsx:174:                    <div className="min-w-0 flex-1 max-[820px]:hidden">
src/components/whatsapp/instagram-readonly-list.tsx:175:                      <div className="flex items-start justify-between gap-2 min-w-0">
src/components/whatsapp/instagram-readonly-list.tsx:176:                        <div className="min-w-0">
src/components/whatsapp/instagram-readonly-list.tsx:181:                            <Instagram className="h-3 w-3" />
src/components/whatsapp/instagram-readonly-list.tsx:193:                        <span className="inline-flex items-center h-4.5 px-1.5 rounded-full border text-[9.5px] font-medium whitespace-nowrap bg-pink-50 text-pink-700 border-pink-200">
src/components/whatsapp/instagram-readonly-list.tsx:197:                          <span className="inline-flex items-center h-4.5 px-1.5 rounded-full border text-[9.5px] font-medium whitespace-nowrap bg-muted/40 text-foreground/80 border-border/50">
src/components/whatsapp/messenger-readonly-thread.tsx:4:import type { MetaMessageRow } from "@/lib/meta/view-types";
src/components/whatsapp/messenger-readonly-thread.tsx:73:    <section
src/components/whatsapp/messenger-readonly-thread.tsx:76:        "h-full min-h-0 min-w-0 flex flex-col overflow-hidden bg-[#efeae2] border-r border-black/10",
src/components/whatsapp/messenger-readonly-thread.tsx:80:      <header className="shrink-0 h-[60px] bg-[#f0f2f5] border-b border-black/10 flex items-center justify-between px-4.5 gap-3 min-w-0 sticky top-0 z-10">
src/components/whatsapp/messenger-readonly-thread.tsx:81:        <div className="flex items-center gap-2.5 min-w-0">
src/components/whatsapp/messenger-readonly-thread.tsx:83:          <div className="min-w-0">
src/components/whatsapp/messenger-readonly-thread.tsx:84:            <div className="flex items-center gap-2 min-w-0">
src/components/whatsapp/messenger-readonly-thread.tsx:88:              <span className="inline-flex items-center h-[22px] px-2 rounded-full border text-[10px] font-medium bg-blue-50 text-blue-700 border-blue-200">
src/components/whatsapp/messenger-readonly-thread.tsx:94:                <MessageCircle className="h-3.5 w-3.5" />
src/components/whatsapp/messenger-readonly-thread.tsx:108:      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-5 sm:px-8 bg-[#efeae2] relative before:absolute before:inset-0 before:pointer-events-none before:opacity-[0.38] before:bg-[radial-gradient(circle_at_12px_12px,rgba(120,113,108,0.22)_1.2px,transparent_1.3px),radial-gradient(circle_at_32px_28px,rgba(120,113,108,0.16)_1px,transparent_1.2px),linear-gradient(45deg,transparent_0_46%,rgba(120,113,108,0.12)_46%_47%,transparent_47%_100%)] before:[background-size:48px_48px,56px_56px,72px_72px]">
src/components/whatsapp/messenger-readonly-thread.tsx:109:        <div className="relative z-10 h-full">
src/components/whatsapp/messenger-readonly-thread.tsx:121:            <div className="max-w-[860px] mx-auto">
src/components/whatsapp/messenger-readonly-thread.tsx:125:                    <span className="h-6 inline-flex items-center text-[11px] text-slate-500 bg-white/80 border border-black/5 rounded-full px-3 shadow-sm">
src/components/whatsapp/messenger-readonly-thread.tsx:140:                        <div className="max-w-[min(560px,76%)]">
src/components/whatsapp/messenger-readonly-thread.tsx:143:                              "relative rounded-[9px] px-3.5 py-2.5 pb-6 text-[13.5px] leading-[1.38] tracking-[-0.012em] shadow-[0_1px_1px_rgba(0,0,0,0.10)]",
src/components/whatsapp/messenger-readonly-thread.tsx:154:                                <Paperclip className="h-3 w-3" />
src/components/whatsapp/messenger-readonly-thread.tsx:177:        <div className="max-w-[860px] mx-auto flex items-end gap-2">
src/components/whatsapp/messenger-readonly-thread.tsx:179:            className="flex-1 min-h-11 max-h-28 resize-none rounded-full border-0 bg-white px-4.5 py-3 text-[13.5px] leading-[1.25] outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:bg-white/60 shadow-sm placeholder:text-slate-400"
src/components/whatsapp/messenger-readonly-thread.tsx:202:              "h-11 rounded-full bg-emerald-500 text-white inline-flex items-center justify-center gap-2 px-4 transition-colors hover:bg-emerald-600 shadow-sm",
src/components/whatsapp/messenger-readonly-thread.tsx:228:            {sending ? null : <SendHorizontal className="h-4 w-4" />}
src/components/whatsapp/messenger-readonly-thread.tsx:232:    </section>
src/components/whatsapp/conversation-list.tsx:102:    <div className="w-80 border-r flex flex-col bg-card shrink-0">
src/components/whatsapp/conversation-list.tsx:112:          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
src/components/whatsapp/conversation-list.tsx:117:            className="pl-8 h-8 text-xs"
src/components/whatsapp/conversation-list.tsx:123:      <div className="flex gap-0.5 p-1.5 border-b overflow-x-auto">
src/components/whatsapp/conversation-list.tsx:130:              "h-6 px-2 text-[10px] shrink-0",
src/components/whatsapp/conversation-list.tsx:144:            <MessageSquare className="h-8 w-8 text-muted-foreground/40 mb-2" />
src/components/whatsapp/conversation-list.tsx:153:                "w-full flex items-start gap-2.5 p-3 text-left border-b transition-colors hover:bg-muted/50",
src/components/whatsapp/conversation-list.tsx:159:                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 text-xs font-semibold">
src/components/whatsapp/conversation-list.tsx:169:                    "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
src/components/whatsapp/conversation-list.tsx:176:              <div className="flex-1 min-w-0">
src/components/whatsapp/conversation-list.tsx:186:                    <Badge key={t} variant="outline" className="text-[9px] h-4 px-1 py-0">
src/components/whatsapp/conversation-list.tsx:191:                    <Badge className="ml-auto h-4 min-w-4 px-1 text-[10px] bg-green-600 hover:bg-green-600 text-white">
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:11:    [data-corevix-wa-grid="true"] {
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:12:      height: calc(100vh - 72px) !important;
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:16:    [data-corevix-wa-grid="true"] > * {
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:26:    [data-corevix-wa-panel="true"] section {
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:35:      line-height: 1.15 !important;
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:40:      line-height: 1.3 !important;
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:45:      height: 32px !important;
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:56:      line-height: 1.25 !important;
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:59:    [data-whatsapp-quick-replies-slot] section,
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:60:    [data-whatsapp-task-slot] section {
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:79:      height: 29px !important;
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:91:      display: grid !important;
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:92:      grid-template-columns: minmax(0,1fr) 108px !important;
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:100:      height: 30px !important;
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:104:      [data-corevix-wa-grid="true"] {
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:105:        grid-template-columns: minmax(340px,380px) minmax(0,1fr) minmax(285px,310px) !important;
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:110:      [data-corevix-wa-grid="true"] {
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:111:        grid-template-columns: minmax(300px,340px) minmax(0,1fr) 276px !important;
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:116:      [data-corevix-wa-panel="true"] section {
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:122:      [data-corevix-wa-grid="true"] {
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:123:        grid-template-columns: 292px minmax(0,1fr) 252px !important;
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:129:      [data-corevix-wa-panel="true"] section {
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:142:      [data-corevix-wa-grid="true"] {
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:143:        grid-template-columns: 286px minmax(0,1fr) !important;
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:151:      [data-corevix-wa-grid="true"] {
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:152:        grid-template-columns: 280px minmax(0,1fr) !important;
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:158:        overflow-x: auto !important;
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:163:      [data-corevix-wa-grid="true"] {
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:164:        grid-template-columns: 1fr !important;
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:169:      [data-corevix-wa-grid="true"] > section,
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:170:      [data-corevix-wa-grid="true"] > main {
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:178:function markWhatsappGridFallback() {
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:179:  const grid = document.querySelector<HTMLElement>('div[class*="grid-cols-[76px_390px"]');
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:180:  if (grid) grid.dataset.corevixWaGrid = "true";
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:191:        markWhatsappGridFallback();
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:195:    window.addEventListener("resize", run);
src/components/whatsapp/WhatsAppResponsiveCompact.tsx:200:      window.removeEventListener("resize", run);
src/components/whatsapp/WhatsAppQuickReplies.tsx:24:      display: grid !important;
src/components/whatsapp/WhatsAppQuickReplies.tsx:25:      grid-template-columns: minmax(0, 1fr) 118px !important;
src/components/whatsapp/WhatsAppQuickReplies.tsx:32:      height: 34px !important;
src/components/whatsapp/WhatsAppQuickReplies.tsx:38:      line-height: 1.1 !important;
src/components/whatsapp/WhatsAppQuickReplies.tsx:46:      line-height: 1.25 !important;
src/components/whatsapp/WhatsAppQuickReplies.tsx:84:  return Array.from(panel.querySelectorAll<HTMLElement>("section")).find((section) =>
src/components/whatsapp/WhatsAppQuickReplies.tsx:85:    section.textContent?.includes("Envío rápido"),
src/components/whatsapp/WhatsAppQuickReplies.tsx:232:    <section className="rounded-2xl border border-[#dce8e2] bg-white p-3 shadow-sm">
src/components/whatsapp/WhatsAppQuickReplies.tsx:235:          <Sparkles className="h-4 w-4 text-[#008069]" />
src/components/whatsapp/WhatsAppQuickReplies.tsx:244:          className="inline-flex h-8 items-center gap-1 rounded-xl border border-[#bcebd0] bg-[#e9fff1] px-2 text-[11px] font-black text-[#008069] hover:bg-[#d9fdd3]"
src/components/whatsapp/WhatsAppQuickReplies.tsx:247:          {creating ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
src/components/whatsapp/WhatsAppQuickReplies.tsx:260:            className="mb-2 h-9 w-full rounded-xl border border-[#dce8e2] bg-white px-3 text-xs font-bold text-[#12231d] outline-none focus:border-[#9edebc]"
src/components/whatsapp/WhatsAppQuickReplies.tsx:267:            className="mb-2 min-h-[86px] w-full rounded-xl border border-[#dce8e2] bg-white px-3 py-2 text-xs text-[#12231d] outline-none focus:border-[#9edebc]"
src/components/whatsapp/WhatsAppQuickReplies.tsx:270:            <button type="button" onClick={() => setCreating(false)} className="h-9 flex-1 rounded-xl border border-[#dce8e2] bg-white text-xs font-black text-[#52645d] hover:bg-[#edf6f2]">
src/components/whatsapp/WhatsAppQuickReplies.tsx:273:            <button type="button" onClick={handleSaveCustomReply} disabled={!newLabel.trim() || !newMessage.trim()} className="inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-xl bg-[#00a884] text-xs font-black text-white hover:bg-[#008f72] disabled:opacity-50">
src/components/whatsapp/WhatsAppQuickReplies.tsx:274:              <Save className="h-3.5 w-3.5" /> Guardar
src/components/whatsapp/WhatsAppQuickReplies.tsx:282:        <button type="button" onClick={() => setOpen((value) => !value)} className="flex h-11 w-full items-center justify-between gap-2 rounded-2xl border border-[#dce8e2] bg-[#f7fbf9] px-3 text-left text-xs font-black text-[#52645d] shadow-sm hover:border-[#bcebd0] hover:bg-[#e9fff1] hover:text-[#008069]">
src/components/whatsapp/WhatsAppQuickReplies.tsx:284:          <ChevronDown className={`h-4 w-4 shrink-0 transition ${open ? "rotate-180" : ""}`} />
src/components/whatsapp/WhatsAppQuickReplies.tsx:288:          <div className="absolute left-0 right-0 top-12 z-50 max-h-72 overflow-y-auto rounded-2xl border border-[#dce8e2] bg-white p-2 shadow-[0_18px_38px_rgba(18,35,29,.16)]">
src/components/whatsapp/WhatsAppQuickReplies.tsx:297:                  className="flex min-w-0 flex-1 items-start justify-between gap-2 rounded-xl px-3 py-2 text-left"
src/components/whatsapp/WhatsAppQuickReplies.tsx:299:                  <span className="min-w-0">
src/components/whatsapp/WhatsAppQuickReplies.tsx:305:                  <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#008069]" />
src/components/whatsapp/WhatsAppQuickReplies.tsx:308:                  <button type="button" onClick={() => handleDeleteCustomReply(reply.label)} className="mr-1 mt-2 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[#7b8d86] hover:bg-red-50 hover:text-red-600" title="Eliminar respuesta">
src/components/whatsapp/WhatsAppQuickReplies.tsx:309:                    <X className="h-3.5 w-3.5" />
src/components/whatsapp/WhatsAppQuickReplies.tsx:317:    </section>,
src/components/whatsapp/template-selector.tsx:91:      <DialogContent className="max-w-lg">
src/components/whatsapp/template-selector.tsx:94:            <FileText className="h-4 w-4" /> Message Templates
src/components/whatsapp/template-selector.tsx:99:          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
src/components/whatsapp/template-selector.tsx:104:            className="pl-8 h-8 text-xs"
src/components/whatsapp/template-selector.tsx:108:        <ScrollArea className="max-h-80">
src/components/whatsapp/template-selector.tsx:117:                className="w-full text-left border rounded-lg p-3 hover:bg-muted/50 transition-colors"
src/components/whatsapp/template-selector.tsx:122:                    <Badge variant="outline" className="text-[9px] h-4">
src/components/whatsapp/template-selector.tsx:127:                      className="text-[9px] h-4"
src/components/whatsapp/message-thread.tsx:45:  sent: <Check className="h-3 w-3 text-muted-foreground/60" />,
src/components/whatsapp/message-thread.tsx:46:  delivered: <CheckCheck className="h-3 w-3 text-muted-foreground/60" />,
src/components/whatsapp/message-thread.tsx:47:  read: <CheckCheck className="h-3 w-3 text-blue-500" />,
src/components/whatsapp/message-thread.tsx:48:  failed: <Clock className="h-3 w-3 text-destructive" />,
src/components/whatsapp/message-thread.tsx:93:    <div className="flex-1 flex flex-col min-w-0">
src/components/whatsapp/message-thread.tsx:95:      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-card">
src/components/whatsapp/message-thread.tsx:97:          <div className="h-9 w-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 text-xs font-semibold">
src/components/whatsapp/message-thread.tsx:112:            <Button variant="ghost" size="icon" className="h-8 w-8">
src/components/whatsapp/message-thread.tsx:113:              <MoreHorizontal className="h-4 w-4" />
src/components/whatsapp/message-thread.tsx:126:        <div className="space-y-1 max-w-2xl mx-auto">
src/components/whatsapp/message-thread.tsx:138:                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-200 text-xs px-3 py-2 rounded-lg max-w-[85%]">
src/components/whatsapp/message-thread.tsx:140:                          <StickyNote className="h-3 w-3" />
src/components/whatsapp/message-thread.tsx:158:                        "max-w-[70%] px-3 py-2 rounded-2xl text-sm shadow-sm",
src/components/whatsapp/message-thread.tsx:198:            <StickyNote className="h-3 w-3" />
src/components/whatsapp/message-thread.tsx:204:        <div className="flex items-center gap-1.5 max-w-2xl mx-auto">
src/components/whatsapp/message-thread.tsx:211:                  className="h-8 w-8 shrink-0"
src/components/whatsapp/message-thread.tsx:214:                  <StickyNote className={cn("h-4 w-4", isNoteMode && "text-amber-600")} />
src/components/whatsapp/message-thread.tsx:226:                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
src/components/whatsapp/message-thread.tsx:227:                  <Paperclip className="h-4 w-4" />
src/components/whatsapp/message-thread.tsx:240:                  className="h-8 w-8 shrink-0"
src/components/whatsapp/message-thread.tsx:243:                  <FileText className="h-4 w-4" />
src/components/whatsapp/message-thread.tsx:260:            className={cn("h-9 text-sm", isNoteMode && "border-amber-300 dark:border-amber-700")}
src/components/whatsapp/message-thread.tsx:265:            className={cn("h-9 w-9 shrink-0", isNoteMode && "bg-amber-600 hover:bg-amber-700")}
src/components/whatsapp/message-thread.tsx:269:            <Send className="h-4 w-4" />
src/components/whatsapp/inbox-unified-list.tsx:48:        "inline-flex items-center h-4.5 px-1.5 rounded-full border text-[9.5px] font-medium whitespace-nowrap",
src/components/whatsapp/inbox-unified-list.tsx:96:        "h-full min-h-0 w-[350px] max-[1450px]:w-[340px] max-[1180px]:w-[300px] max-[820px]:w-[82px] border-r border-black/10 bg-white min-w-0 overflow-hidden flex flex-col",
src/components/whatsapp/inbox-unified-list.tsx:105:          <span className="min-w-6 h-5 px-2 rounded-full bg-white/80 text-slate-600 text-[11px] grid place-items-center font-semibold border border-black/5">
src/components/whatsapp/inbox-unified-list.tsx:110:        <div className="grid grid-cols-4 gap-1 max-[820px]:hidden">
src/components/whatsapp/inbox-unified-list.tsx:122:                "h-8 rounded-full border text-[11px] font-medium transition-colors",
src/components/whatsapp/inbox-unified-list.tsx:134:          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 shadow-sm max-[820px]:hidden">
src/components/whatsapp/inbox-unified-list.tsx:140:          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
src/components/whatsapp/inbox-unified-list.tsx:142:            className="w-full h-[38px] rounded-full border-0 bg-white pl-9 pr-3 text-[13px] text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/30 shadow-sm placeholder:text-slate-400"
src/components/whatsapp/inbox-unified-list.tsx:153:            className="h-[34px] w-full rounded-full bg-white px-3.5 text-[12px] font-medium text-slate-700 shadow-sm border border-black/5 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors"
src/components/whatsapp/inbox-unified-list.tsx:155:            <span className="inline-flex items-center gap-2 min-w-0">
src/components/whatsapp/inbox-unified-list.tsx:156:              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
src/components/whatsapp/inbox-unified-list.tsx:162:                "h-4 w-4 text-slate-400 transition-transform",
src/components/whatsapp/inbox-unified-list.tsx:170:      <div className="flex-1 min-h-0 overflow-y-auto p-0 bg-white">
src/components/whatsapp/inbox-unified-list.tsx:193:                    "relative block w-full text-left rounded-none px-3.5 py-3.5 transition-colors hover:bg-[#f5f6f6] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 border-b border-black/[0.06]",
src/components/whatsapp/inbox-unified-list.tsx:200:                      "absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full transition-colors",
src/components/whatsapp/inbox-unified-list.tsx:212:                        <span className="absolute -top-1 -left-1 h-4 min-w-4 px-1 rounded-full border-2 border-card bg-emerald-500 text-white text-[10px] font-semibold grid place-items-center max-[820px]:hidden">
src/components/whatsapp/inbox-unified-list.tsx:217:                        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-card hidden max-[820px]:block" />
src/components/whatsapp/inbox-unified-list.tsx:221:                    <div className="min-w-0 flex-1 max-[820px]:hidden">
src/components/whatsapp/inbox-unified-list.tsx:222:                      <div className="flex items-start justify-between gap-2 min-w-0">
src/components/whatsapp/inbox-unified-list.tsx:223:                        <div className="min-w-0">
src/components/whatsapp/WhatsAppInlineTaskCreator.tsx:68:  const section = button.closest("section");
src/components/whatsapp/WhatsAppInlineTaskCreator.tsx:69:  return section?.parentElement || section || null;
src/components/whatsapp/WhatsAppInlineTaskCreator.tsx:279:    <section className="rounded-2xl border border-[#bcebd0] bg-[#f0fff6] p-3 shadow-sm">
src/components/whatsapp/WhatsAppInlineTaskCreator.tsx:281:        <div className="flex min-w-0 items-center gap-2 text-sm font-black text-[#12231d]">
src/components/whatsapp/WhatsAppInlineTaskCreator.tsx:282:          {mode === "task" ? <Clock3 className="h-4 w-4 shrink-0 text-[#008069]" /> : <StickyNote className="h-4 w-4 shrink-0 text-[#008069]" />}
src/components/whatsapp/WhatsAppInlineTaskCreator.tsx:288:          className="grid h-8 w-8 place-items-center rounded-xl border border-[#cfe2d9] bg-white text-[#52645d] hover:bg-[#f7fbf9]"
src/components/whatsapp/WhatsAppInlineTaskCreator.tsx:292:          <X className="h-4 w-4" />
src/components/whatsapp/WhatsAppInlineTaskCreator.tsx:306:                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#00a884]" />
src/components/whatsapp/WhatsAppInlineTaskCreator.tsx:322:                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#00a884]" />
src/components/whatsapp/WhatsAppInlineTaskCreator.tsx:343:            className="h-9 rounded-xl border-[#dce8e2] bg-white text-sm"
src/components/whatsapp/WhatsAppInlineTaskCreator.tsx:350:            className="min-h-[58px] rounded-xl border-[#dce8e2] bg-white text-sm"
src/components/whatsapp/WhatsAppInlineTaskCreator.tsx:352:          <div className="grid grid-cols-2 gap-2">
src/components/whatsapp/WhatsAppInlineTaskCreator.tsx:357:              className="h-9 rounded-xl border-[#dce8e2] bg-white text-xs"
src/components/whatsapp/WhatsAppInlineTaskCreator.tsx:363:              <SelectTrigger className="h-9 rounded-xl border-[#dce8e2] bg-white text-xs">
src/components/whatsapp/WhatsAppInlineTaskCreator.tsx:376:            <Button type="button" variant="outline" size="sm" className="h-9 flex-1 rounded-xl" onClick={() => setOpen(false)} disabled={saving}>
src/components/whatsapp/WhatsAppInlineTaskCreator.tsx:379:            <Button type="submit" size="sm" className="h-9 flex-1 rounded-xl bg-[#00a884] hover:bg-[#008f72]" disabled={saving || !form.title.trim()}>
src/components/whatsapp/WhatsAppInlineTaskCreator.tsx:380:              <Save className="mr-1.5 h-3.5 w-3.5" /> {saving ? "..." : "Guardar"}
src/components/whatsapp/WhatsAppInlineTaskCreator.tsx:398:            className="min-h-[92px] rounded-xl border-[#dce8e2] bg-white text-sm"
src/components/whatsapp/WhatsAppInlineTaskCreator.tsx:401:            <Button type="button" variant="outline" size="sm" className="h-9 flex-1 rounded-xl" onClick={() => setOpen(false)} disabled={saving}>
src/components/whatsapp/WhatsAppInlineTaskCreator.tsx:404:            <Button type="submit" size="sm" className="h-9 flex-1 rounded-xl bg-[#00a884] hover:bg-[#008f72]" disabled={saving || !noteBody.trim()}>
src/components/whatsapp/WhatsAppInlineTaskCreator.tsx:405:              <Save className="mr-1.5 h-3.5 w-3.5" /> {saving ? "..." : "Guardar nota"}
src/components/whatsapp/WhatsAppInlineTaskCreator.tsx:410:    </section>,
src/components/whatsapp/WhatsAppClient360Bridge.tsx:80:  const targetGrid = productCard.closest(".grid") as HTMLElement | null;
src/components/whatsapp/WhatsAppClient360Bridge.tsx:81:  const target = targetGrid || productCard;
src/components/whatsapp/WhatsAppClient360Bridge.tsx:106:    <section className="rounded-[18px] border border-[#bcebd0] bg-[#f0fff6] p-4 shadow-[0_10px_24px_rgba(18,35,29,.06)]">
src/components/whatsapp/WhatsAppClient360Bridge.tsx:110:            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-[#00a884] text-white">
src/components/whatsapp/WhatsAppClient360Bridge.tsx:111:              <MessageCircle className="h-4 w-4" />
src/components/whatsapp/WhatsAppClient360Bridge.tsx:121:          className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#00a884] px-3 text-xs font-black text-white hover:bg-[#008f72]"
src/components/whatsapp/WhatsAppClient360Bridge.tsx:123:          Abrir chat <ArrowRight className="h-3.5 w-3.5" />
src/components/whatsapp/WhatsAppClient360Bridge.tsx:127:      <div className="mt-3 grid gap-2 sm:grid-cols-4">
src/components/whatsapp/WhatsAppClient360Bridge.tsx:129:          <MessageCircle className="mb-1 h-4 w-4 text-[#008069]" />
src/components/whatsapp/WhatsAppClient360Bridge.tsx:134:          <StickyNote className="mb-1 h-4 w-4 text-[#008069]" />
src/components/whatsapp/WhatsAppClient360Bridge.tsx:139:          <Clock3 className="mb-1 h-4 w-4 text-[#008069]" />
src/components/whatsapp/WhatsAppClient360Bridge.tsx:144:          <FileText className="mb-1 h-4 w-4 text-[#008069]" />
src/components/whatsapp/WhatsAppClient360Bridge.tsx:151:        <a href="/tasks" className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-[#dce8e2] bg-white px-2.5 text-[11px] font-black text-[#52645d] hover:bg-[#f7fbf9]">
src/components/whatsapp/WhatsAppClient360Bridge.tsx:152:          <Clock3 className="h-3.5 w-3.5" /> Ver tareas
src/components/whatsapp/WhatsAppClient360Bridge.tsx:154:        <a href="/proposals" className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-[#dce8e2] bg-white px-2.5 text-[11px] font-black text-[#52645d] hover:bg-[#f7fbf9]">
src/components/whatsapp/WhatsAppClient360Bridge.tsx:155:          <FileText className="h-3.5 w-3.5" /> Propuestas
src/components/whatsapp/WhatsAppClient360Bridge.tsx:157:        <a href="/invoices" className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-[#dce8e2] bg-white px-2.5 text-[11px] font-black text-[#52645d] hover:bg-[#f7fbf9]">
src/components/whatsapp/WhatsAppClient360Bridge.tsx:158:          <Receipt className="h-3.5 w-3.5" /> Facturas
src/components/whatsapp/WhatsAppClient360Bridge.tsx:161:    </section>
src/components/whatsapp/WhatsAppClient360Bridge.tsx:198:  const card = useMemo(() => {
src/components/whatsapp/WhatsAppClient360Bridge.tsx:204:  return createPortal(card, slot);
src/components/whatsapp/messenger-context-panel.tsx:3:import type { MetaConversationListRow } from "@/lib/meta/view-types";
src/components/whatsapp/messenger-context-panel.tsx:32:    <section
src/components/whatsapp/messenger-context-panel.tsx:34:        "rounded-[18px] border border-black/5 bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.06)]",
src/components/whatsapp/messenger-context-panel.tsx:40:    </section>
src/components/whatsapp/messenger-context-panel.tsx:865:      className={cn("min-h-0 border-l border-black/10 bg-[#f0f2f5] overflow-y-auto p-4", className)}
src/components/whatsapp/messenger-context-panel.tsx:896:              className="w-full"
src/components/whatsapp/messenger-context-panel.tsx:906:          <div className="flex items-start gap-3 min-w-0">
src/components/whatsapp/messenger-context-panel.tsx:912:            <div className="min-w-0 flex-1">
src/components/whatsapp/messenger-context-panel.tsx:917:                <span className="inline-flex items-center h-6 px-2.5 rounded-full border text-[11px] font-medium bg-blue-50 text-blue-700 border-blue-200">
src/components/whatsapp/messenger-context-panel.tsx:921:                  <span className="inline-flex items-center h-6 px-2.5 rounded-full border text-[11px] font-medium bg-muted/30 text-muted-foreground border-border/60">
src/components/whatsapp/messenger-context-panel.tsx:970:                    className="h-8 px-3 text-xs"
src/components/whatsapp/messenger-context-panel.tsx:979:            <div className="h-px bg-black/5" />
src/components/whatsapp/messenger-context-panel.tsx:997:            <div className="h-px bg-black/5" />
src/components/whatsapp/messenger-context-panel.tsx:1026:          <div className="grid gap-2">
src/components/whatsapp/messenger-context-panel.tsx:1204:            <div className="grid grid-cols-2 gap-4">
src/components/whatsapp/messenger-context-panel.tsx:1274:            <div className="grid grid-cols-2 gap-4">
src/components/whatsapp/messenger-context-panel.tsx:1315:            <div className="grid grid-cols-2 gap-4">
src/components/whatsapp/messenger-context-panel.tsx:1388:                    <div className="min-w-0">
src/components/whatsapp/messenger-context-panel.tsx:1423:                    <div className="min-w-0">
src/components/whatsapp/WhatsAppOperationalFilters.tsx:23:  { key: "all", label: "Todos", icon: <Inbox className="h-3.5 w-3.5" /> },
src/components/whatsapp/WhatsAppOperationalFilters.tsx:24:  { key: "unread", label: "No leídos", icon: <SearchCheck className="h-3.5 w-3.5" /> },
src/components/whatsapp/WhatsAppOperationalFilters.tsx:25:  { key: "pending", label: "Sin responder", icon: <Reply className="h-3.5 w-3.5" /> },
src/components/whatsapp/WhatsAppOperationalFilters.tsx:26:  { key: "proposal", label: "Con propuesta", icon: <FileText className="h-3.5 w-3.5" /> },
src/components/whatsapp/WhatsAppOperationalFilters.tsx:27:  { key: "invoice", label: "Con factura", icon: <Receipt className="h-3.5 w-3.5" /> },
src/components/whatsapp/WhatsAppOperationalFilters.tsx:28:  { key: "task", label: "Con tarea", icon: <ClipboardList className="h-3.5 w-3.5" /> },
src/components/whatsapp/WhatsAppOperationalFilters.tsx:29:  { key: "closed", label: "Cerrados", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
src/components/whatsapp/WhatsAppOperationalFilters.tsx:56:      className.includes("mb-1") && className.includes("w-full") && className.includes("text-left")
src/components/whatsapp/WhatsAppOperationalFilters.tsx:145:    <div className="mt-2 rounded-2xl border border-[#e0ebe6] bg-[#f7fbf9] p-2 shadow-inner">
src/components/whatsapp/WhatsAppOperationalFilters.tsx:167:          className="flex h-9 w-full items-center justify-between gap-2 rounded-2xl border border-[#dce8e2] bg-white px-3 text-left text-xs font-black text-[#52645d] shadow-sm hover:border-[#bcebd0] hover:bg-[#e9fff1] hover:text-[#008069]"
src/components/whatsapp/WhatsAppOperationalFilters.tsx:169:          <span className="flex min-w-0 items-center gap-2">
src/components/whatsapp/WhatsAppOperationalFilters.tsx:176:          <ChevronDown className={`h-4 w-4 shrink-0 transition ${open ? "rotate-180" : ""}`} />
src/components/whatsapp/WhatsAppOperationalFilters.tsx:180:          <div className="absolute left-0 right-0 top-10 z-50 max-h-72 overflow-y-auto rounded-2xl border border-[#dce8e2] bg-white p-1.5 shadow-[0_16px_34px_rgba(18,35,29,.15)]">
src/components/whatsapp/WhatsAppOperationalFilters.tsx:192:                  className={`flex h-9 w-full items-center justify-between gap-2 rounded-xl px-2.5 text-left text-xs font-black transition ${
src/components/whatsapp/WhatsAppOperationalFilters.tsx:198:                  <span className="flex min-w-0 items-center gap-2">
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:100:    <div data-whatsapp-panel-root className="absolute inset-0 z-20 flex min-h-0 flex-col bg-[#f9fcfa] p-3 text-[#12231d]">
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:101:      <div className="mb-2 rounded-3xl border border-[#dce8e2] bg-white p-3 shadow-sm">
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:103:          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#d9fdd3] text-sm font-black text-[#008069]">
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:111:          <div className="min-w-0 flex-1">
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:123:          <PanelIconButton title="Perfil" href="/clients" icon={<UserRound className="h-4 w-4" />} />
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:127:      <div className="mb-2 rounded-3xl border border-[#bcebd0] bg-[#e9fff1] p-3 shadow-sm">
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:133:          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#00a884] text-white">
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:134:            <CheckCircle2 className="h-4 w-4" />
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:137:        <div className="grid grid-cols-3 gap-2">
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:138:          <GuideStep icon={<Users className="h-3.5 w-3.5" />} label="Lead" active={snapshot.state.toLowerCase().includes("lead") || snapshot.state.toLowerCase().includes("open")} />
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:139:          <GuideStep icon={<FileText className="h-3.5 w-3.5" />} label="Cotizar" />
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:140:          <GuideStep icon={<Receipt className="h-3.5 w-3.5" />} label="Cobrar" />
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:144:      <div className="mb-2 rounded-3xl border border-[#dce8e2] bg-white p-3 shadow-sm">
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:147:          <Send className="h-4 w-4 text-[#00a884]" />
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:149:        <div className="grid grid-cols-2 gap-2">
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:150:          <ActionButton title="Propuesta" href={proposalHref} icon={<FileText className="h-4 w-4" />} label="Propuesta" />
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:151:          <ActionButton title="Factura" href={invoiceHref} icon={<Receipt className="h-4 w-4" />} label="Factura" />
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:158:      <div className="mb-2 rounded-3xl border border-[#dce8e2] bg-white p-3 shadow-sm">
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:161:          <Clock3 className="h-4 w-4 text-[#00a884]" />
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:163:        <div className="grid grid-cols-2 gap-2">
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:169:            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#dce8e2] bg-[#f7fbf9] text-xs font-black text-[#52645d] hover:bg-[#edf6f2]"
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:171:            <StickyNote className="h-4 w-4" />
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:179:      <div className="mb-2 rounded-3xl border border-[#dce8e2] bg-white p-3 shadow-sm">
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:186:        <div className="grid grid-cols-2 gap-2 text-center">
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:187:          <Metric icon={<CalendarClock className="h-3.5 w-3.5" />} label="Restante" value={snapshot.remaining} />
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:188:          <Metric icon={<Bot className="h-3.5 w-3.5" />} label="Bot" value="CRM" />
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:192:      <div className="min-h-0 flex-1 rounded-3xl border border-[#dce8e2] bg-white p-3 shadow-sm">
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:194:          <Activity className="h-4 w-4 text-[#00a884]" />
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:209:      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#dce8e2] bg-[#f7fbf9] text-[#52645d] hover:bg-[#edf6f2]"
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:219:      <div className="mx-auto mb-1 grid h-6 w-6 place-items-center rounded-full bg-white text-[#00a884]">{icon}</div>
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:230:      className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#dce8e2] bg-[#f7fbf9] text-xs font-black text-[#52645d] hover:bg-[#edf6f2]"
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:250:      className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#dce8e2] bg-[#f7fbf9] text-xs font-black text-[#52645d] hover:bg-[#edf6f2]"
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:252:      <Clock3 className="h-4 w-4" />
src/components/whatsapp/WhatsAppPanelOrganizer.tsx:261:      <div className="mx-auto mb-1 grid h-6 w-6 place-items-center rounded-full bg-white text-[#00a884]">{icon}</div>
src/components/whatsapp/whatsapp-settings.tsx:15:import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
src/components/whatsapp/whatsapp-settings.tsx:346:          {/* Status card */}
src/components/whatsapp/whatsapp-settings.tsx:347:          <Card className="border-0 shadow-sm">
src/components/whatsapp/whatsapp-settings.tsx:356:                    <CheckCircle2 className="h-3 w-3" /> Connected
src/components/whatsapp/whatsapp-settings.tsx:360:                    <XCircle className="h-3 w-3" /> Not Connected
src/components/whatsapp/whatsapp-settings.tsx:367:                <div className="grid grid-cols-3 gap-4 text-xs">
src/components/whatsapp/whatsapp-settings.tsx:392:          <Card className="border-0 shadow-sm">
src/components/whatsapp/whatsapp-settings.tsx:395:                <Shield className="h-4 w-4 text-muted-foreground" /> API Credentials
src/components/whatsapp/whatsapp-settings.tsx:403:              <div className="grid grid-cols-2 gap-4">
src/components/whatsapp/whatsapp-settings.tsx:440:              <div className="grid grid-cols-2 gap-4">
src/components/whatsapp/whatsapp-settings.tsx:481:                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
src/components/whatsapp/whatsapp-settings.tsx:486:                  <AlertTriangle className="h-3 w-3" />
src/components/whatsapp/whatsapp-settings.tsx:514:                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
src/components/whatsapp/whatsapp-settings.tsx:519:                  <AlertTriangle className="h-3 w-3" />
src/components/whatsapp/whatsapp-settings.tsx:544:                  <RefreshCw className="h-3.5 w-3.5" />
src/components/whatsapp/whatsapp-settings.tsx:557:          <Card className="border-0 shadow-sm">
src/components/whatsapp/whatsapp-settings.tsx:576:                    <Copy className="h-4 w-4" />
src/components/whatsapp/whatsapp-settings.tsx:604:                <div className="grid grid-cols-2 gap-2">
src/components/whatsapp/whatsapp-settings.tsx:643:          <Card className="border-0 shadow-sm border-l-4 border-l-primary">
src/components/whatsapp/whatsapp-settings.tsx:666:              <Button variant="link" className="text-xs p-0 h-auto mt-2 gap-1">
src/components/whatsapp/whatsapp-settings.tsx:667:                <ExternalLink className="h-3 w-3" /> View full documentation
src/components/whatsapp/whatsapp-settings.tsx:675:          <Card className="border-0 shadow-sm">
src/components/whatsapp/whatsapp-settings.tsx:680:                    <FileText className="h-4 w-4 text-muted-foreground" /> Message Templates
src/components/whatsapp/whatsapp-settings.tsx:686:                    <RefreshCw className="h-3 w-3" /> Sync from Meta
src/components/whatsapp/whatsapp-settings.tsx:689:                    <Plus className="h-3 w-3" /> New Template
src/components/whatsapp/whatsapp-settings.tsx:704:          <Card className="border-0 shadow-sm">
src/components/whatsapp/whatsapp-settings.tsx:758:                <div className="grid grid-cols-2 gap-4 mt-2">
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:19:function getGrid() {
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:20:  return document.querySelector<HTMLElement>('div[class*="grid-cols-[76px_390px"]');
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:37:    [data-corevix-wa-grid="true"] { min-width: 0; }
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:38:    [data-corevix-wa-grid="true"] > aside:first-child { display: none !important; }
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:39:    [data-corevix-wa-panel="true"] { overflow-x: hidden !important; scrollbar-width: thin; }
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:40:    [data-corevix-wa-panel="true"] section { border-radius: 18px !important; box-shadow: 0 8px 18px rgba(18,35,29,.045) !important; }
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:41:    [data-corevix-wa-main-button="true"], [data-corevix-wa-button="true"] { width: 100% !important; min-width: 0 !important; height: 36px !important; display: flex !important; align-items: center !important; justify-content: center !important; gap: 7px !important; border-radius: 13px !important; padding: 0 10px !important; white-space: nowrap !important; }
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:44:    [data-corevix-wa-label="true"] { pointer-events: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; font-weight: 900; line-height: 1; }
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:45:    [data-corevix-wa-doc-actions="true"] { display: grid !important; grid-template-columns: repeat(2,minmax(0,1fr)) !important; gap: 7px !important; width: 100% !important; }
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:46:    [data-corevix-wa-doc-card="true"] { border-color: #bcebd0 !important; background: linear-gradient(180deg,#f0fff6,#ffffff) !important; }
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:47:    [data-corevix-wa-doc-helper="true"] { margin-top: 7px; border-radius: 12px; background: #e9fff1; padding: 7px 9px; color: #52645d; font-size: 10.5px; font-weight: 700; line-height: 1.25; }
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:48:    [data-corevix-wa-empty-doc-helper="true"] { margin-top: 5px; color: #6c7f77; font-size: 10.5px; line-height: 1.3; }
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:51:    [data-corevix-wa-next="true"] [data-corevix-wa-main-button="true"] { height: 34px !important; }
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:52:    [data-corevix-wa-next="true"] .text-xs { font-size: 10.5px !important; line-height: 1.2 !important; }
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:53:    [data-corevix-wa-channel-row="true"] { display: flex !important; flex-wrap: nowrap !important; gap: 6px !important; overflow-x: auto !important; padding-bottom: 1px !important; scrollbar-width: none !important; }
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:55:    [data-corevix-wa-channel-button="true"] { height: 31px !important; flex: 0 0 auto !important; padding: 0 10px !important; border-radius: 999px !important; font-size: 12px !important; line-height: 1 !important; }
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:57:    @media (min-width: 1461px) { [data-corevix-wa-grid="true"] { grid-template-columns: minmax(350px,390px) minmax(0,1fr) minmax(300px,320px) !important; } }
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:58:    @media (min-width: 1180px) and (max-width: 1460px) { [data-corevix-wa-grid="true"] { grid-template-columns: minmax(330px,360px) minmax(0,1fr) 292px !important; } [data-corevix-wa-panel="true"] { display: block !important; } }
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:59:    @media (min-width: 981px) and (max-width: 1179px) { [data-corevix-wa-grid="true"] { grid-template-columns: minmax(320px,350px) minmax(0,1fr) !important; } [data-corevix-wa-panel="true"] { display: none !important; } }
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:60:    @media (max-width: 980px) { [data-corevix-wa-grid="true"] { grid-template-columns: minmax(280px,360px) minmax(0,1fr) !important; } [data-corevix-wa-panel="true"] { display: none !important; } }
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:61:    @media (max-width: 760px) { [data-corevix-wa-grid="true"] { grid-template-columns: 1fr !important; } }
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:69:  button.classList.remove("grid", "place-items-center", "w-10", "h-10", "w-9", "h-9");
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:81:  return Array.from(panel.querySelectorAll<HTMLElement>("section")).find((section) => {
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:82:    const txt = section.textContent || "";
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:88:  return Array.from(panel.querySelectorAll<HTMLElement>("section")).find((section) => section.textContent?.includes("Envío rápido")) || null;
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:92:  return Array.from(panel.querySelectorAll<HTMLElement>("section")).find((section) => {
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:93:    const txt = section.textContent || "";
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:99:  const grid = getGrid();
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:100:  if (!grid) return;
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:101:  const firstAside = grid.firstElementChild as HTMLElement | null;
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:117:  const internal = task?.closest("section") as HTMLElement | null;
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:130:  const section = findQuickSendSection(panel);
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:131:  if (!section) return;
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:132:  const emptyDoc = Array.from(section.querySelectorAll<HTMLElement>("p")).find((p) => p.textContent?.includes("No hay docs listos") || p.textContent?.includes("No hay documentos listos"));
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:143:  const prepareButton = section.querySelector<HTMLElement>('[title="Preparar mensaje"]');
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:144:  const openButton = section.querySelector<HTMLElement>('[title="Abrir documento"]');
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:151:    setAttr(docCard, "data-corevix-wa-doc-card", "true");
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:162:  const section = findNextSection(panel);
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:163:  if (!section) return;
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:164:  setAttr(section, "data-corevix-wa-next", "true");
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:165:  const main = section.querySelector<HTMLElement>('[title="Crear lead"], [title="Crear cliente"], [title="Crear propuesta"], [title="Crear factura"], [title="Preparar seguimiento"], [title="Preparar"], [title="Ver"]');
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:174:  const grid = getGrid();
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:175:  if (grid) setAttr(grid, "data-corevix-wa-grid", "true");
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:207:    window.addEventListener("resize", run);
src/components/whatsapp/WhatsAppPanelPhase2Safe.tsx:213:      window.removeEventListener("resize", run);
src/components/whatsapp/instagram-context-panel.tsx:2:import type { MetaConversationListRow } from "@/lib/meta/view-types";
src/components/whatsapp/instagram-context-panel.tsx:7:    <div className="rounded-2xl border border-black/5 bg-white px-3.5 py-3 shadow-sm">
src/components/whatsapp/instagram-context-panel.tsx:24:      className={cn("min-h-0 border-l border-black/10 bg-[#f0f2f5] overflow-y-auto p-4", className)}
src/components/whatsapp/instagram-context-panel.tsx:27:        <div className="rounded-2xl border border-black/5 bg-white px-4 py-4 shadow-sm">
src/components/whatsapp/instagram-context-panel.tsx:37:        <div className="grid gap-3">
src/components/whatsapp/instagram-context-panel.tsx:38:          <div className="rounded-2xl border border-black/5 bg-white px-3.5 py-3 shadow-sm flex items-center gap-3">
src/components/whatsapp/instagram-context-panel.tsx:46:            <div className="min-w-0">
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:122:          <section className="hero">
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:132:            <div className="hero-card hero-card-upgraded">
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:158:                <div className="hero-offer-card">
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:203:                <div className="floating-card floating-card-1">
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:208:                <div className="floating-card floating-card-2">
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:214:          </section>
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:216:          <section className="section">
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:218:            <h2 className="section-title">
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:221:            <p className="section-copy">
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:227:                <article key={idx} className="card">
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:231:                  <h3 className="card-title">{String(item?.title ?? "")}</h3>
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:232:                  <p className="card-copy">{String(item?.copy ?? "")}</p>
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:236:          </section>
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:238:          <section className="section">
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:240:            <h2 className="section-title">
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:243:            <p className="section-copy">{String(data.productDescription ?? "")}</p>
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:255:          </section>
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:257:          <section className="section">
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:259:            <h2 className="section-title">
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:262:            <p className="section-copy">
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:276:          </section>
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:278:          <section className="section">
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:280:            <h2 className="section-title">
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:285:                <article key={idx} className="card process-card">
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:288:                    <h3 className="card-title">{String(item?.title ?? "")}</h3>
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:289:                    <p className="card-copy">{String(item?.copy ?? "")}</p>
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:294:          </section>
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:296:          <section className="section">
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:298:            <h2 className="section-title">Lo que esta propuesta puede mejorar</h2>
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:299:            <div className="two-grid">
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:301:                <article key={idx} className="card">
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:305:                  <h3 className="card-title">{String(item?.title ?? "")}</h3>
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:306:                  <p className="card-copy">{String(item?.copy ?? "")}</p>
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:310:          </section>
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:312:          <section className="section">
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:314:            <h2 className="section-title">Inversión para iniciar</h2>
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:315:            <div className="investment-card">
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:321:              <div className="scope-card">
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:345:          </section>
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:347:          <section className="section">
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:349:            <h2 className="section-title">
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:352:            <p className="section-copy">
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:369:          </section>
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:371:          <section className="section">
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:373:            <h2 className="section-title">Alcance, revisión y tiempos</h2>
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:374:            <p className="section-copy">
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:380:                <article key={idx} className="card">
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:384:                  <h3 className="card-title">{String(item?.title ?? "")}</h3>
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:385:                  <p className="card-copy">{String(item?.copy ?? "")}</p>
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:389:          </section>
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:391:          <section className="section dark-cta">
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:393:            <h2 className="section-title">¿Listo para aprobar y avanzar?</h2>
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:394:            <p className="section-copy">
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:399:              <h3 className="card-title">Al aprobar esta propuesta avanzamos con:</h3>
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:409:          </section>
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:462:        <rect x="3" y="5" width="18" height="14" rx="3" />
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:471:        <rect x="3" y="4" width="18" height="17" rx="3" />
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:487:        <path d="M12 22a10 10 0 1 1 10-10c0 2.2-1.8 4-4 4h-1.5a1.5 1.5 0 0 0 0 3H17a5 5 0 0 1-5 3Z" />
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:522:  "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%223360%22%20height%3D%22487%22%20viewBox%3D%220%200%203360%20487%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%3Cpath%20d%3D%22M1077.82%20478.427V8.02191H1320.09C1365.01%208.02191%201399.34%2011.8724%201423.09%2019.5735C1446.83%2027.2745%201465.98%2041.607%201480.52%2062.5709C1495.07%2083.3209%201502.34%20108.67%201502.34%20138.619C1502.34%20164.717%201496.78%20187.285%201485.66%20206.324C1474.53%20225.148%201459.24%20240.443%201439.77%20252.209C1427.37%20259.696%201410.36%20265.9%201388.75%20270.82C1406.08%20276.596%201418.7%20282.371%201426.62%20288.147C1431.96%20291.998%201439.67%20300.233%201449.72%20312.855C1459.99%20325.476%201466.83%20335.209%201470.26%20342.054L1540.53%20478.427H1376.24L1298.59%20334.674C1288.75%20316.063%201279.98%20303.977%201272.28%20298.415C1261.79%20291.142%201249.92%20287.505%201236.66%20287.505H1223.82V478.427H1077.82ZM1223.82%20198.623H1285.11C1291.74%20198.623%201304.58%20196.483%201323.62%20192.205C1333.24%20190.28%201341.05%20185.36%201347.04%20177.445C1353.24%20169.53%201356.34%20160.438%201356.34%20150.17C1356.34%20134.982%201351.53%20123.324%201341.91%20115.195C1332.28%20107.066%201314.2%20103.001%201287.68%20103.001H1223.82V198.623Z%22%20fill%3D%22black%22%2F%3E%0A%3Cpath%20d%3D%22M510.194%20243.545C510.194%20166.749%20531.585%20106.959%20574.369%2064.1753C617.153%2021.3918%20676.729%200%20753.097%200C831.391%200%20891.716%2021.0709%20934.072%2063.2127C976.427%20105.141%20997.605%20163.968%20997.605%20239.695C997.605%20294.672%20988.3%20339.808%20969.689%20375.105C951.292%20410.187%20924.552%20437.569%20889.47%20457.249C854.601%20476.716%20811.069%20486.449%20758.873%20486.449C705.821%20486.449%20661.861%20477.999%20626.993%20461.1C592.338%20444.2%20564.208%20417.46%20542.602%20380.88C520.997%20344.301%20510.194%20298.522%20510.194%20243.545ZM655.551%20244.187C655.551%20291.677%20664.321%20325.797%20681.863%20346.547C699.618%20367.297%20723.684%20377.672%20754.06%20377.672C785.292%20377.672%20809.465%20367.511%20826.578%20347.188C843.691%20326.866%20852.248%20290.393%20852.248%20237.77C852.248%20193.489%20843.264%20161.187%20825.294%20140.865C807.539%20120.329%20783.367%20110.061%20752.776%20110.061C723.47%20110.061%20699.939%20120.436%20682.184%20141.186C664.428%20161.936%20655.551%20196.269%20655.551%20244.187Z%22%20fill%3D%22%230D0D0D%22%2F%3E%0A%3Cpath%20d%3D%22M330.182%20286.222L457.57%20324.727C449.013%20360.451%20435.536%20390.293%20417.139%20414.252C398.743%20438.21%20375.853%20456.286%20348.472%20468.48C321.304%20480.673%20286.65%20486.77%20244.508%20486.77C193.382%20486.77%20151.561%20479.39%20119.045%20464.629C86.7436%20449.655%2058.8274%20423.45%2035.2964%20386.014C11.7655%20348.579%200%20300.661%200%20242.262C0%20164.396%2020.6431%20104.606%2061.9292%2062.8918C103.429%2020.9639%20162.043%200%20237.77%200C297.025%200%20343.552%2011.9794%20377.351%2035.9382C411.364%2059.897%20436.606%2096.6908%20453.078%20146.32L324.727%20174.878C320.235%20160.545%20315.529%20150.063%20310.608%20143.432C302.48%20132.308%20292.532%20123.751%20280.767%20117.762C269.001%20111.772%20255.846%20108.777%20241.299%20108.777C208.356%20108.777%20183.114%20122.04%20165.572%20148.566C152.309%20168.246%20145.678%20199.157%20145.678%20241.299C145.678%20293.495%20153.593%20329.326%20169.423%20348.793C185.253%20368.045%20207.5%20377.672%20236.165%20377.672C263.974%20377.672%20284.938%20369.864%20299.057%20354.248C313.389%20338.632%20323.764%20315.956%20330.182%20286.222Z%22%20fill%3D%22%230D0D0D%22%2F%3E%0A%3Cpath%20d%3D%22M2863%208.02191H3023.11L3106.54%20152.737L3187.4%208.02191H3345.92L3199.6%20235.844L3359.71%20478.427H3196.39L3103.65%20327.294L3010.6%20478.427H2848.24L3010.6%20233.277L2863%208.02191Z%22%20fill%3D%22%230D0D0D%22%2F%3E%0A%3Cpath%20d%3D%22M2645.12%208.02191H2790.8V478.427H2645.12V8.02191Z%22%20fill%3D%22%230D0D0D%22%2F%3E%0A%3Cpath%20d%3D%22M2081.34%208.02191H2233.44L2339.33%20346.547L2443.61%208.02191H2591.21L2416.66%20478.427H2259.11L2081.34%208.02191Z%22%20fill%3D%22%230D0D0D%22%2F%3E%0A%3Cpath%20d%3D%22M1601.82%2010H2011.82V110H1601.82V10Z%22%20fill%3D%22%231560FF%22%2F%3E%0A%3Cpath%20d%3D%22M1601.82%20190H1929.82V299H1601.82V190Z%22%20fill%3D%22%231560FF%22%2F%3E%0A%3Crect%20x%3D%221601.82%22%20y%3D%22369%22%20width%3D%22410%22%20height%3D%2299%22%20fill%3D%22%231560FF%22%2F%3E%0A%3C%2Fsvg%3E";
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:536:    --card: #ffffff;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:542:    --shadow-soft: 0 10px 26px rgba(7, 17, 31, 0.06);
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:570:    min-height: 100vh;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:587:  .section {
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:592:  .section + .section {
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:614:    height: auto;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:648:  .hero-card {
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:653:    box-shadow: var(--shadow-soft);
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:656:  .hero-card-upgraded {
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:665:  .hero-card-upgraded::before {
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:670:    height: 180px;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:679:    line-height: 1.05;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:693:    line-height: 1.65;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:697:    display: grid;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:698:    grid-template-columns: 1fr 1fr;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:730:    height: 28px;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:745:    display: grid;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:768:    height: 19px;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:770:    display: grid;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:780:    display: grid;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:787:  .hero-offer-card {
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:805:    line-height: 0.95;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:814:    line-height: 1.55;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:821:    min-height: 315px;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:857:    height: 6px;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:864:  .floating-card {
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:872:    display: grid;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:876:  .floating-card strong {
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:879:    line-height: 1.2;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:884:  .floating-card span {
src/componegrep: src/pages: No such file or directory
grep: src/app: No such file or directory
nts/proposals/templates/SocialMediaProposalTemplate.tsx:887:    line-height: 1.45;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:890:  .floating-card-1 {
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:895:  .floating-card-2 {
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:900:  .section-title {
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:903:    line-height: 1.15;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:909:  .section-copy {
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:913:    line-height: 1.7;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:917:    display: grid;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:922:  .two-grid {
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:923:    display: grid;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:924:    grid-template-columns: 1fr 1fr;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:929:  .card {
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:930:    background: var(--card);
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:934:    box-shadow: var(--shadow-soft);
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:937:  .card-title {
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:940:    line-height: 1.25;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:946:  .card-copy {
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:949:    line-height: 1.6;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:955:    height: 42px;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:956:    display: grid;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:966:    height: 20px;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:978:    display: grid;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:994:    height: 28px;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:1000:    display: grid;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:1018:    line-height: 1.55;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:1027:    box-shadow: var(--shadow-soft);
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:1054:    line-height: 1.55;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:1059:  .process-card {
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:1067:    height: 34px;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:1072:    display: grid;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:1081:  .investment-card {
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:1093:    line-height: 0.95;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:1103:    line-height: 1.65;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:1106:  .scope-card {
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:1112:    box-shadow: var(--shadow-soft);
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:1120:    line-height: 1.6;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:1125:    display: grid;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:1163:  .dark-cta .section-title {
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:1167:  .dark-cta .section-copy {
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:1183:    display: grid;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:1193:    line-height: 1.6;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:1198:    height: 10px;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:1236:    line-height: 1.55;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:1244:    display: grid;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:1249:    height: 46px;
src/components/proposals/templates/SocialMediaProposalTemplate.tsx:1261:    box-shadow: var(--shadow-soft);
src/components/reports/sales-report-center.tsx:6:  CartesianGrid,
src/components/reports/sales-report-center.tsx:380:    <div className="rounded-2xl border bg-white shadow-sm">
src/components/reports/sales-report-center.tsx:381:      <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
src/components/reports/sales-report-center.tsx:394:                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold ${activeReport === report.id ? "border bg-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
src/components/reports/sales-report-center.tsx:397:                <ChevronDown className="h-4 w-4 text-slate-400" />
src/components/reports/sales-report-center.tsx:403:        <section className="p-5">
src/components/reports/sales-report-center.tsx:404:          <div className="grid gap-4 xl:grid-cols-[1fr_220px_220px]">
src/components/reports/sales-report-center.tsx:442:          <div className="mt-5 grid gap-3 sm:grid-cols-3">
src/components/reports/sales-report-center.tsx:448:          <div className="mt-5 grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
src/components/reports/sales-report-center.tsx:452:                <ResponsiveContainer width="100%" height={260}>
src/components/reports/sales-report-center.tsx:454:                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
src/components/reports/sales-report-center.tsx:470:                <div className="grid h-[260px] place-items-center text-sm font-medium text-slate-500">
src/components/reports/sales-report-center.tsx:478:                <ResponsiveContainer width="100%" height={260}>
src/components/reports/sales-report-center.tsx:497:                <div className="grid h-[260px] place-items-center text-sm font-medium text-slate-500">
src/components/reports/sales-report-center.tsx:507:                <RefreshCw className="mr-2 h-4 w-4" />
src/components/reports/sales-report-center.tsx:514:                <Download className="mr-2 h-4 w-4" />
src/components/reports/sales-report-center.tsx:518:            <div className="relative sm:w-72">
src/components/reports/sales-report-center.tsx:519:              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
src/components/reports/sales-report-center.tsx:529:          <div className="mt-4 overflow-hidden rounded-xl border">
src/components/reports/sales-report-center.tsx:530:            <div className="overflow-x-auto">
src/components/reports/sales-report-center.tsx:573:        </section>
```
