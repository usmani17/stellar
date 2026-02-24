import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";

export const MetaAds: React.FC = () => {
  const { accountId, channelId } = useParams<{ accountId: string; channelId: string }>();

  useEffect(() => {
    setPageTitle("Meta Ads");
    return () => resetPageTitle();
  }, []);

  return (
    <div className="px-4 pt-[104px] pb-6 sm:px-6 lg:px-8 lg:pt-[112px] lg:pb-8 bg-white">
      <h1 className="text-[22px] sm:text-[24px] font-medium text-[#072929] leading-normal">
        Meta Ads
      </h1>
      <p className="mt-2 text-[14px] text-[#556179]">
        Brand {accountId} · Channel {channelId}
      </p>
    </div>
  );
};
