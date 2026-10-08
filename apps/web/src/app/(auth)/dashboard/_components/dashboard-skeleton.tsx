import { Skeleton } from "@oneglanse/ui";
import overview from "./overview.module.css";
import styles from "./skeleton.module.css";

const METRICS = ["rank", "share", "gap"] as const;
const ROWS = ["first", "second", "third", "fourth", "fifth"] as const;

function MetricSkeleton() {
	return (
		<>
			<Skeleton className="h-3.5 w-24 max-w-full" />
			<Skeleton className="my-3.5 h-12 w-28 max-w-full" />
			<Skeleton className="h-3 w-48 max-w-full" />
		</>
	);
}

function ChartSkeleton() {
	return (
		<section className="geo-card">
			<div className="geo-card-head">
				<Skeleton className="h-4 w-32" />
			</div>
			<div className="px-5 pb-5">
				<Skeleton className="mb-5 h-3 w-44 max-w-full" />
				<div className={styles.chart}>
					{ROWS.map((row) => (
						<div key={row} className={styles.chartLine} />
					))}
				</div>
				<div className="mt-3 flex justify-between gap-4">
					{METRICS.map((key) => (
						<Skeleton key={key} className="h-3 w-12" />
					))}
				</div>
			</div>
		</section>
	);
}

/** Content-only placeholder: the page already owns the heading and filters. */
export function DashboardSkeleton({
	monitoring,
	label,
}: {
	monitoring: boolean;
	label: string;
}) {
	return (
		<div className={styles.root}>
			<output className="sr-only">{label}</output>
			<div aria-hidden="true" className={overview.overview}>
				{monitoring ? (
					<>
						<section className={overview.competition}>
							<div className={overview.competitionHeading}>
								<div className="min-w-0 space-y-2">
									<Skeleton className="h-5 w-32" />
									<Skeleton className="h-3 w-52 max-w-full" />
								</div>
								<Skeleton className="h-7 w-28 rounded-full" />
							</div>
							<div className={overview.competitionStats}>
								{METRICS.map((key, index) => (
									<div
										key={key}
										className={
											index === 0 ? overview.rankStat : overview.competitionStat
										}
									>
										<MetricSkeleton />
									</div>
								))}
							</div>
						</section>
						<section className="geo-card">
							<div className="geo-card-head">
								<Skeleton className="h-4 w-28" />
							</div>
							<div className={styles.table}>
								<div className={styles.tableHead}>
									{["brand", ...METRICS].map((key) => (
										<Skeleton key={key} className="h-3 w-20 max-w-full" />
									))}
								</div>
								{ROWS.map((key) => (
									<div key={key} className={styles.tableRow}>
										<Skeleton className="h-4 w-36 max-w-full" />
										{METRICS.map((metric) => (
											<Skeleton key={metric} className="h-3 w-16 max-w-full" />
										))}
									</div>
								))}
							</div>
						</section>
						<section className="geo-card">
							<div className="geo-section-title">
								<Skeleton className="h-4 w-28" />
							</div>
							<div className="geo-stat-grid">
								{ROWS.map((key) => (
									<div key={key} className="geo-stat-tile">
										<Skeleton className="h-3 w-20 max-w-full" />
										<Skeleton className="mt-3 h-7 w-24 max-w-full" />
									</div>
								))}
							</div>
						</section>
					</>
				) : (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
						{["responses", ...METRICS].map((key) => (
							<section key={key} className="geo-card p-5">
								<MetricSkeleton />
							</section>
						))}
					</div>
				)}
				<div className={overview.trends}>
					<ChartSkeleton />
					<ChartSkeleton />
				</div>
			</div>
		</div>
	);
}
