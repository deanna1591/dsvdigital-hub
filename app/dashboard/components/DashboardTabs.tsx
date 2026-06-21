"use client";

import { useState } from "react";
import CatalogGrid from "./CatalogGrid";
import OrdersTable from "./OrdersTable";
import ActivityTable from "./ActivityTable";
import MissionsGrid from "./MissionsGrid";
import FeedTimeline from "./FeedTimeline";
import SparkOfTheDay from "./SparkOfTheDay";
import BingoBoard from "./BingoBoard";
import SlotMachine from "./SlotMachine";
import type {
  CatalogItem, EmployeeBalance, RedemptionOrder, PointActivity, PointCategory,
  Mission, MissionSubmission, DailySpark, DailySparkClaim,
  BingoEvent, BingoSquare, BingoClaim, SlotSpin
} from "@/lib/types";
import type { FeedEvent } from "@/lib/types";

export default function DashboardTabs(props: {
  me: EmployeeBalance;
  catalog: CatalogItem[];
  orders: RedemptionOrder[];
  activity: PointActivity[];
  categories: PointCategory[];
  missions: Mission[];
  mySubmissions: MissionSubmission[];
  feed: FeedEvent[];
  todaysSpark: DailySpark | null;
  todaysClaim: DailySparkClaim | null;
  recentSparkClaims: DailySparkClaim[];
  totalSparksApproved: number;
  sparkStreak: number;
  activeBingo: BingoEvent | null;
  bingoSquares: BingoSquare[];
  myBingoClaims: BingoClaim[];
  spinBalance: number;
  recentSpins: SlotSpin[];
  totalSpinsEarned: number;
  totalSpinsSpent: number;
  topWins: { employee_name: string; payout_points: number; win_label: string; created_at: string }[];
}) {
  const { me, catalog, orders, activity, categories, missions, mySubmissions, feed,
    todaysSpark, todaysClaim, recentSparkClaims, totalSparksApproved, sparkStreak,
    activeBingo, bingoSquares, myBingoClaims,
    spinBalance, recentSpins, totalSpinsEarned, totalSpinsSpent, topWins } = props;

  const [tab, setTab] = useState<"today" | "feed" | "slots" | "missions" | "bingo" | "catalog" | "orders" | "activity">("today");
  const pendingCount = orders.filter((o) => o.status === "pending" || o.status === "processing").length;
  const pendingSubsCount = mySubmissions.filter((s) => s.status === "pending").length;
  const availableMissionCount = missions.filter((m) => {
    const mySubs = mySubmissions.filter((s) => s.mission_id === m.id);
    const approved = mySubs.filter((s) => s.status === "approved").length;
    const hasPending = mySubs.some((s) => s.status === "pending");
    const atLimit = m.max_per_user > 0 && approved >= m.max_per_user;
    return !hasPending && !atLimit;
  }).length;
  const todayPending = todaysSpark && !todaysClaim;

  return (
    <>
      <div className="flex gap-1 sm:gap-2 border-b-[1.5px] border-graphite mb-7 -mb-[1.5px] overflow-x-auto scrollbar-thin">
        <TabBtn active={tab === "today"} onClick={() => setTab("today")}>
          ✨ Today
          {todayPending && (
            <span className="ml-1.5 inline-block bg-goldrush text-graphite text-[10px] px-1.5 py-0.5 rounded-full font-bold animate-pulse border border-graphite">!</span>
          )}
        </TabBtn>
        <TabBtn active={tab === "slots"} onClick={() => setTab("slots")}>
          💿 Slots
          {spinBalance > 0 && (
            <span className="ml-1.5 inline-block bg-bubblegum text-graphite text-[10px] px-1.5 py-0.5 rounded-full font-bold border border-graphite">
              {spinBalance}
            </span>
          )}
        </TabBtn>
        <TabBtn active={tab === "feed"} onClick={() => setTab("feed")}>
          📺 Feed
          {feed.length > 0 && (
            <span className="ml-1.5 inline-block bg-good text-paper text-[10px] px-1.5 py-0.5 rounded-full font-bold">{feed.length}</span>
          )}
        </TabBtn>
        {activeBingo && (
          <TabBtn active={tab === "bingo"} onClick={() => setTab("bingo")}>🎲 Bingo</TabBtn>
        )}
        <TabBtn active={tab === "missions"} onClick={() => setTab("missions")}>
          ⚡ Missions
          {availableMissionCount > 0 && (
            <span className="ml-1.5 inline-block bg-goldrush text-graphite text-[10px] px-1.5 py-0.5 rounded-full font-bold border border-graphite">
              {availableMissionCount}
            </span>
          )}
        </TabBtn>
        <TabBtn active={tab === "catalog"} onClick={() => setTab("catalog")}>💸 Catalog</TabBtn>
        <TabBtn active={tab === "orders"} onClick={() => setTab("orders")}>
          📦 Orders
          {(pendingCount + pendingSubsCount) > 0 && (
            <span className="ml-1.5 inline-block bg-goldrush text-graphite text-[10px] px-1.5 py-0.5 rounded-full font-bold border border-graphite">
              {pendingCount + pendingSubsCount}
            </span>
          )}
        </TabBtn>
        <TabBtn active={tab === "activity"} onClick={() => setTab("activity")}>📊 My Points</TabBtn>
      </div>

      {tab === "today" && (
        <SparkOfTheDay
          todaysSpark={todaysSpark}
          todaysClaim={todaysClaim}
          recentClaims={recentSparkClaims}
          totalClaimed={totalSparksApproved}
          daysActive={sparkStreak}
        />
      )}
      {tab === "slots" && (
        <SlotMachine
          spinBalance={spinBalance}
          recentSpins={recentSpins}
          totalEarned={totalSpinsEarned}
          totalSpent={totalSpinsSpent}
          topWins={topWins}
        />
      )}
      {tab === "feed" && <FeedTimeline events={feed} currentUserName={me.name} />}
      {tab === "bingo" && activeBingo && (
        <BingoBoard event={activeBingo} squares={bingoSquares} myClaims={myBingoClaims} />
      )}
      {tab === "missions" && <MissionsGrid missions={missions} mySubmissions={mySubmissions} />}
      {tab === "catalog" && <CatalogGrid catalog={catalog} balance={me.balance} />}
      {tab === "orders" && <OrdersTable orders={orders} />}
      {tab === "activity" && <ActivityTable activity={activity} categories={categories} />}
    </>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 sm:px-5 py-3 text-sm font-bold border-b-[3px] -mb-[1.5px] transition-all whitespace-nowrap ${
        active ? "text-graphite border-goldrush" : "text-ink-soft border-transparent hover:text-graphite hover:border-line"
      }`}
    >
      {children}
    </button>
  );
}
