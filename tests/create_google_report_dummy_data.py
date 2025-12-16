#!/usr/bin/env python3
"""
Populate Google Ads report/analytics tables with dummy data for a given account.

Usage:
  python create_google_report_dummy_data.py <account_id> [days]

Examples:
  # Populate last 30 days of data (default)
  python create_google_report_dummy_data.py 1

  # Populate last 90 days of data
  python create_google_report_dummy_data.py 1 90

The script:
  - Ensures all Google entity + report tables exist for the account
  - Reads existing entities (campaigns, adgroups, ads, keywords)
  - Inserts synthetic daily metrics into:
      ads_google.reports_campaign_{account_id}
      ads_google.reports_adgroup_{account_id}
      ads_google.reports_keyword_{account_id}
      ads_google.reports_ad_{account_id}

This is only for local/dev use to make frontend charts & tables look populated.
"""

import os
import sys
import random
from datetime import date, timedelta

import django

# Add the project directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "stellar_backend.settings")
django.setup()

from django.conf import settings  # noqa: E402
from django.db import connection  # noqa: E402

from accounts.utils.google_table_utils import (  # noqa: E402
    ensure_all_google_entities_tables_exist,
    ensure_all_google_report_tables_exist,
)


GOOGLE_ADS_SCHEMA = getattr(settings, "GOOGLE_ADS_SCHEMA", "ads_google")


def daterange(days: int):
    """Yield dates for the last `days` days, including today (most recent first)."""
    today = date.today()
    for i in range(days):
        yield today - timedelta(days=i)


def fetch_rows(cursor, sql: str):
    cursor.execute(sql)
    return cursor.fetchall()


def populate_campaign_reports(account_id: int, days: int):
    with connection.cursor() as cursor:
        entities_table = f"{GOOGLE_ADS_SCHEMA}.entities_campaign_{account_id}"
        report_table = f"{GOOGLE_ADS_SCHEMA}.reports_campaign_{account_id}"

        # Fetch basic campaign dimensions
        campaigns = fetch_rows(
            cursor,
            f"""
            SELECT campaign_id, customer_id
            FROM {entities_table}
        """,
        )

        if not campaigns:
            print("  - No campaigns found, skipping campaign reports")
            return

        print(f"  - Populating campaign reports for {len(campaigns)} campaigns")

        # Optional: clear existing dummy data (dev only)
        cursor.execute(f"DELETE FROM {report_table}")

        rows = []
        for d in daterange(days):
            for campaign_id, customer_id in campaigns:
                impressions = random.randint(100, 5000)
                clicks = random.randint(0, max(1, impressions // 5))
                avg_cpc = random.uniform(0.3, 2.0)
                cost_micros = int(clicks * avg_cpc * 1_000_000)
                conversions = round(random.uniform(0, clicks * 0.3), 2)
                conv_value_per = random.uniform(20, 120)
                conversion_value = round(conversions * conv_value_per, 2)

                rows.append(
                    (
                        d,
                        str(customer_id),
                        int(campaign_id),
                        impressions,
                        clicks,
                        cost_micros,
                        conversions,
                        conversion_value,
                        conversions,  # all_conversions
                        conversion_value,  # all_conversion_value
                    )
                )

        insert_sql = f"""
            INSERT INTO {report_table} (
                date,
                customer_id,
                campaign_id,
                impressions,
                clicks,
                cost_micros,
                conversions,
                conversion_value,
                all_conversions,
                all_conversion_value
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.executemany(insert_sql, rows)
        print(f"  - Inserted {len(rows)} campaign report rows")


def populate_adgroup_reports(account_id: int, days: int):
    with connection.cursor() as cursor:
        entities_table = f"{GOOGLE_ADS_SCHEMA}.entities_adgroup_{account_id}"
        report_table = f"{GOOGLE_ADS_SCHEMA}.reports_adgroup_{account_id}"

        adgroups = fetch_rows(
            cursor,
            f"""
            SELECT adgroup_id, campaign_id, customer_id
            FROM {entities_table}
        """,
        )

        if not adgroups:
            print("  - No adgroups found, skipping adgroup reports")
            return

        print(f"  - Populating adgroup reports for {len(adgroups)} adgroups")

        cursor.execute(f"DELETE FROM {report_table}")

        rows = []
        for d in daterange(days):
            for adgroup_id, campaign_id, customer_id in adgroups:
                impressions = random.randint(50, 3000)
                clicks = random.randint(0, max(1, impressions // 4))
                avg_cpc = random.uniform(0.2, 1.5)
                cost_micros = int(clicks * avg_cpc * 1_000_000)
                conversions = round(random.uniform(0, clicks * 0.35), 2)
                conv_value_per = random.uniform(15, 100)
                conversion_value = round(conversions * conv_value_per, 2)

                rows.append(
                    (
                        d,
                        str(customer_id),
                        int(campaign_id),
                        int(adgroup_id),
                        impressions,
                        clicks,
                        cost_micros,
                        conversions,
                        conversion_value,
                        conversions,
                        conversion_value,
                    )
                )

        insert_sql = f"""
            INSERT INTO {report_table} (
                date,
                customer_id,
                campaign_id,
                adgroup_id,
                impressions,
                clicks,
                cost_micros,
                conversions,
                conversion_value,
                all_conversions,
                all_conversion_value
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.executemany(insert_sql, rows)
        print(f"  - Inserted {len(rows)} adgroup report rows")


def populate_keyword_reports(account_id: int, days: int):
    with connection.cursor() as cursor:
        entities_table = f"{GOOGLE_ADS_SCHEMA}.entities_keyword_{account_id}"
        report_table = f"{GOOGLE_ADS_SCHEMA}.reports_keyword_{account_id}"

        keywords = fetch_rows(
            cursor,
            f"""
            SELECT keyword_id, adgroup_id, campaign_id, customer_id
            FROM {entities_table}
        """,
        )

        if not keywords:
            print("  - No keywords found, skipping keyword reports")
            return

        print(f"  - Populating keyword reports for {len(keywords)} keywords")

        cursor.execute(f"DELETE FROM {report_table}")

        rows = []
        for d in daterange(days):
            for keyword_id, adgroup_id, campaign_id, customer_id in keywords:
                impressions = random.randint(20, 1500)
                clicks = random.randint(0, max(1, impressions // 3))
                avg_cpc = random.uniform(0.1, 1.0)
                cost_micros = int(clicks * avg_cpc * 1_000_000)
                conversions = round(random.uniform(0, clicks * 0.4), 2)
                conv_value_per = random.uniform(10, 80)
                conversion_value = round(conversions * conv_value_per, 2)

                rows.append(
                    (
                        d,
                        str(customer_id),
                        int(campaign_id),
                        int(adgroup_id),
                        int(keyword_id),
                        impressions,
                        clicks,
                        cost_micros,
                        conversions,
                        conversion_value,
                        conversions,
                        conversion_value,
                    )
                )

        insert_sql = f"""
            INSERT INTO {report_table} (
                date,
                customer_id,
                campaign_id,
                adgroup_id,
                keyword_id,
                impressions,
                clicks,
                cost_micros,
                conversions,
                conversion_value,
                all_conversions,
                all_conversion_value
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.executemany(insert_sql, rows)
        print(f"  - Inserted {len(rows)} keyword report rows")


def populate_ad_reports(account_id: int, days: int):
    with connection.cursor() as cursor:
        entities_table = f"{GOOGLE_ADS_SCHEMA}.entities_ad_{account_id}"
        report_table = f"{GOOGLE_ADS_SCHEMA}.reports_ad_{account_id}"

        ads = fetch_rows(
            cursor,
            f"""
            SELECT ad_id, adgroup_id, campaign_id, customer_id
            FROM {entities_table}
        """,
        )

        if not ads:
            print("  - No ads found, skipping ad reports")
            return

        print(f"  - Populating ad reports for {len(ads)} ads")

        cursor.execute(f"DELETE FROM {report_table}")

        rows = []
        for d in daterange(days):
            for ad_id, adgroup_id, campaign_id, customer_id in ads:
                impressions = random.randint(10, 1000)
                clicks = random.randint(0, max(1, impressions // 3))
                avg_cpc = random.uniform(0.1, 0.8)
                cost_micros = int(clicks * avg_cpc * 1_000_000)
                conversions = round(random.uniform(0, clicks * 0.5), 2)
                conv_value_per = random.uniform(5, 60)
                conversion_value = round(conversions * conv_value_per, 2)

                rows.append(
                    (
                        d,
                        str(customer_id),
                        int(campaign_id),
                        int(adgroup_id),
                        int(ad_id),
                        impressions,
                        clicks,
                        cost_micros,
                        conversions,
                        conversion_value,
                        conversions,
                        conversion_value,
                    )
                )

        insert_sql = f"""
            INSERT INTO {report_table} (
                date,
                customer_id,
                campaign_id,
                adgroup_id,
                ad_id,
                impressions,
                clicks,
                cost_micros,
                conversions,
                conversion_value,
                all_conversions,
                all_conversion_value
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.executemany(insert_sql, rows)
        print(f"  - Inserted {len(rows)} ad report rows")


def main():
    if len(sys.argv) < 2:
        print("Error: Account ID is required")
        print(f"Usage: {sys.argv[0]} <account_id> [days]")
        print(f"Example: {sys.argv[0]} 1 60")
        sys.exit(1)

    try:
        account_id = int(sys.argv[1])
    except ValueError:
        print(f"Error: Invalid account ID: {sys.argv[1]}")
        print("Account ID must be a number")
        sys.exit(1)

    days = 30
    if len(sys.argv) >= 3:
        try:
            days = int(sys.argv[2])
        except ValueError:
            print(f"Warning: invalid days value '{sys.argv[2]}', defaulting to 30")

    print(f"Populating Google Ads report tables for account ID: {account_id}")
    print(f"Days of history: {days}")
    print("=" * 60)
    print()

    # Ensure all required tables exist first (entities + reports)
    print("Ensuring entity tables exist...")
    entity_results = ensure_all_google_entities_tables_exist(account_id)
    print(f"  Entity tables status: {entity_results}")

    print("Ensuring report tables exist...")
    report_results = ensure_all_google_report_tables_exist(account_id)
    print(f"  Report tables status: {report_results}")
    print()

    populate_campaign_reports(account_id, days)
    populate_adgroup_reports(account_id, days)
    populate_keyword_reports(account_id, days)
    populate_ad_reports(account_id, days)

    print()
    print("✅ Finished populating Google Ads report tables with dummy data.")


if __name__ == "__main__":
    main()


