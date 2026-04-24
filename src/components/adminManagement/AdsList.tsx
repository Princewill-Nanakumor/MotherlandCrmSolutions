// src/components/adminManagement/AdsList.tsx
import React from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileImage,
  Eye,
  Edit,
  Trash2,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Ad {
  _id: string;
  title: string;
  description: string;
  imageUrl: string;
  status: string;
  createdAt: string;
  views?: number;
  clicks?: number;
  ctr?: number;
}

interface AdsListProps {
  ads: Ad[];
}

export default function AdsList({ ads }: AdsListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-800";
      case "INACTIVE":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 border-red-200 dark:border-red-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
      case "DRAFT":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300 border-gray-200 dark:border-gray-800";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300 border-gray-200 dark:border-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatNumber = (num?: number) => {
    if (!num) return "0";
    return num.toLocaleString();
  };

  const formatCTR = (ctr?: number) => {
    if (!ctr) return "0%";
    return `${(ctr * 100).toFixed(2)}%`;
  };

  return (
    <Card className="backdrop-blur-lg bg-white/70 dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-white">
          <FileImage className="h-5 w-5" />
          <span>Ads</span>
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-800">
            {ads.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {ads.length === 0 ? (
            <div className="text-center py-8">
              <FileImage className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-2">
                No ads found
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                This admin has not created any ads yet
              </p>
            </div>
          ) : (
            ads.map((ad) => (
              <div
                key={ad._id}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg backdrop-blur-lg bg-white/50 dark:bg-gray-800/50 hover:bg-white/70 dark:hover:bg-gray-800/70 transition-all duration-200"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                    {ad.imageUrl ? (
                      <Image
                        src={ad.imageUrl}
                        alt={ad.title}
                        width={64}
                        height={64}
                        className="object-cover rounded-lg"
                        style={{ width: "100%", height: "100%" }}
                        unoptimized
                      />
                    ) : (
                      <FileImage className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {ad.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                      {ad.description}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(ad.createdAt)}</span>
                      </div>
                      {ad.views !== undefined && (
                        <div className="flex items-center space-x-1">
                          <Eye className="h-3 w-3" />
                          <span>{formatNumber(ad.views)} views</span>
                        </div>
                      )}
                      {ad.clicks !== undefined && (
                        <div className="flex items-center space-x-1">
                          <TrendingUp className="h-3 w-3" />
                          <span>{formatNumber(ad.clicks)} clicks</span>
                        </div>
                      )}
                      {ad.ctr !== undefined && (
                        <span className="text-green-600 dark:text-green-400">
                          {formatCTR(ad.ctr)} CTR
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(ad.status)}>
                    {ad.status}
                  </Badge>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="backdrop-blur-lg bg-white/70 dark:bg-gray-900/70 border-gray-200 dark:border-gray-700 hover:bg-white/90 dark:hover:bg-gray-900/90"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="backdrop-blur-lg bg-white/70 dark:bg-gray-900/70 border-gray-200 dark:border-gray-700 hover:bg-white/90 dark:hover:bg-gray-900/90"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="backdrop-blur-lg bg-white/70 dark:bg-gray-900/70 border-gray-200 dark:border-gray-700 hover:bg-white/90 dark:hover:bg-gray-900/90"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
