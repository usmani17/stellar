import React from "react";

interface DemandGenAssetsTabProps {
  onCreateImageAsset: () => void;
  onCreateVideoAsset: () => void;
  profileId?: number | null;
}

export const DemandGenAssetsTab: React.FC<DemandGenAssetsTabProps> = ({
  onCreateImageAsset,
  onCreateVideoAsset,
  profileId,
}) => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Demand Gen Assets
        </h3>
        <p className="text-sm text-gray-600">
          Create assets for your Demand Gen campaign. These assets will be used across Gmail, Discover, YouTube, and Display placements.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Logo/Image Asset Creation */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h4 className="text-base font-semibold text-gray-900">Logo / Image Asset</h4>
              <p className="text-sm text-gray-600">Create logo or image assets for your campaign</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="text-sm text-gray-700">
              <strong>Requirements:</strong>
              <ul className="mt-1 ml-4 list-disc text-sm text-gray-600">
                <li>1:1 square ratio (minimum 128×128 pixels)</li>
                <li>Supports PNG, JPG, GIF formats</li>
                <li>Used as campaign logo and brand asset</li>
              </ul>
            </div>
            
            <button
              type="button"
              onClick={onCreateImageAsset}
              disabled={!profileId}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
            >
              Create Logo / Image Asset
            </button>
          </div>
        </div>

        {/* Video Asset Creation */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-base font-semibold text-gray-900">Video Asset</h4>
              <p className="text-sm text-gray-600">Add YouTube video assets for your campaign</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="text-sm text-gray-700">
              <strong>Requirements:</strong>
              <ul className="mt-1 ml-4 list-disc text-sm text-gray-600">
                <li>YouTube video ID or URL</li>
                <li>Publicly accessible YouTube video</li>
                <li>Used in video ad placements</li>
              </ul>
            </div>
            
            <button
              type="button"
              onClick={onCreateVideoAsset}
              disabled={!profileId}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
            >
              Add YouTube Video Asset
            </button>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h4 className="text-sm font-semibold text-blue-900 mb-1">About Demand Gen Assets</h4>
            <p className="text-sm text-blue-800">
              Demand Gen campaigns use visual assets to engage users across Google's platforms. 
              Logo assets appear in brand awareness contexts, while video assets play in 
              YouTube placements. Make sure your assets follow Google's advertising policies 
              and technical requirements.
            </p>
          </div>
        </div>
      </div>

      {!profileId && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-yellow-800">
              Please select a Google Ads profile to create assets for your Demand Gen campaign.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
