import { View } from "@tarojs/components";
import { List, Loading } from "@taroify/core";
import "./indexSLF.scss";
import { useState, useEffect } from "react";
import SongContainerFav from "../SongContainerFav";
import { Song } from "@/models/song";
import { Popup } from "@taroify/core";
import { Play, Like } from "@taroify/icons";
import { usePlayerStore } from "@/store/player";
import { usePlaylistStore } from "@/store/playlist";
import { Toast } from "@taroify/core";
import Taro from "@tarojs/taro";
import { BASE_URL } from "@/service/config";

export default function SongListFav({ reload, user }) {
  const [items, setItems] = useState<Song[]>([]);

  const requestLike = async (ifGood) => {
    try {
      Taro.showLoading({
        title: "加载中",
        mask: true, // 添加遮罩防止触摸穿透
      });

      const response = await Taro.request({
        url: BASE_URL + "/user/favorites/" + popupSong.songId,
        method: "DELETE",
        header: {
          "content-type": "application/json",
          Accept: "application/json",
          openid: user.openid,
        },
        success: (res) => {
          ifGood();
        },
        fail: (err) => {
          Taro.showToast({
            title: "取消收藏失败，请稍后重试",
            icon: "none",
            duration: 2000,
          });
        },
      });
      return response;
    } catch (error) {
      throw error;
    } finally {
      Taro.hideLoading();
    }
  };

  const requestWithLoading = async () => {
    try {
      Taro.showLoading({
        title: "加载中",
        mask: true, // 添加遮罩防止触摸穿透
      });

      const response = await Taro.request({
        url: BASE_URL + "/user/favorites",
        method: "GET",
        header: {
          "content-type": "application/json",
          Accept: "application/json",
          openid: user.openid,
        },
        success: (res) => {
          setItems(res.data.data);
          if (res.data.data) {
            let initItems: Song[];
            if (res.data.data.length < 10) initItems = res.data.data;
            else initItems = res.data.data.slice(0, 10);
            setList(initItems);
          } else setList([]);
        },
        fail: (err) => {
          Taro.showToast({
            title: "加载歌曲失败，请稍后重试",
            icon: "none",
            duration: 2000,
          });
        },
      });
      return response;
    } catch (error) {
      throw error;
    } finally {
      Taro.hideLoading();
    }
  };

  useEffect(() => {
    requestWithLoading();
  }, [reload]);

  const [hasMore, setHasMore] = useState(true);
  let initItems: Song[];
  if (items.length < 10) initItems = items;
  else initItems = items.slice(0, 10);
  const [list, setList] = useState<Song[]>(initItems);

  const [loading, setLoading] = useState(false);
  const [showLoading, setShowLoading] = useState(true);

  let initSong: Song = {
    artists: "",
    coverUrl: "",
    isLike: true,
    name: "",
    songId: "",
  };

  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [popupSong, setPopupSong] = useState<Song>(initSong);
  const [popupSongIndex, setPopupSongIndex] = useState(-1);

  const handleClosePopup = () => {
    setIsPopupVisible(false);
  };

  // 当没有更多数据时显示，2秒后自动隐藏
  useEffect(() => {
    if (!hasMore) {
      const timer = setTimeout(() => {
        setShowLoading(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasMore]);

  const {
    playlistData,
    setPlaylistData,
    currentItemIndex,
    setCurrentItemIndex,
  } = usePlaylistStore();
  const { setSong, currentSong, resume, setIsLike } = usePlayerStore();

  const handleItemClick = (song: Song) => {
    if (currentSong?.songId == song.songId) {
      Taro.navigateTo({ url: "/pages/player/index" });
      return;
    }
    let playlist: Song[] = playlistData;
    let flag = false;
    for (let i = 0; i < playlistData.length; i++) {
      if (playlistData[i].songId == song.songId) {
        setCurrentItemIndex(i);
        flag = true;
        break;
      }
    }
    if (!flag) {
      playlist.splice(currentItemIndex + 1, 0, song);
      setCurrentItemIndex(currentItemIndex + 1);
    }
    setPlaylistData(playlist);
    setSong(song);
    resume();
    Taro.navigateTo({ url: "/pages/player/index" });
  };

  const handleItemIconClick = (
    song: Song,
    index: number,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    setPopupSong(song);
    setPopupSongIndex(index);
    setIsPopupVisible(true);
  };

  const handlePopupNextClick = () => {
    let song: Song = popupSong;
    if (currentSong?.songId == song.songId) {
      Toast.open("歌曲已在播放");
      return;
    }
    let playlist: Song[] = playlistData;
    let currentIndex = currentItemIndex;
    for (let i = 0; i < playlistData.length; i++) {
      if (playlistData[i].songId == song.songId) {
        if (i < currentItemIndex) {
          currentIndex -= 1;
          setCurrentItemIndex(currentIndex);
        }
        playlist.splice(i, 1);
      }
    }
    playlist.splice(currentIndex + 1, 0, song);
    setPlaylistData(playlist);
    if (playlist.length == 1) {
      setSong(popupSong);
      resume();
    }
    setIsPopupVisible(false);
  };

  const handlePopupLikeClick = () => {
    let listChange: Song[] = list;

    for (let i = 0; i < playlistData.length; i++) {
      if (playlistData[i].songId == listChange[popupSongIndex].songId) {
        let playlist: Song[] = playlistData;
        playlist[i].isLike = false;
        setPlaylistData([...playlist]);
        break;
      }
    }

    listChange[popupSongIndex].isLike = !listChange[popupSongIndex].isLike;
    setIsPopupVisible(false);
    requestLike(() => {
      setList(listChange);
      if (currentSong && popupSong.songId == currentSong?.songId) {
        setIsLike();
      }
      requestWithLoading();
    });
  };

  if (!items || items == undefined || items.length == 0)
    return (
      <View
        style={{
          width: "100%",
          paddingTop: 20,
          fontSize: 20,
          color: "#444444",
          textAlign: "center",
        }}
      >
        {"还没有喜欢的歌曲"}
      </View>
    );

  return (
    <View
      style="
            width: 90%;
            padding-left: 5%;
            padding-right: 5%;
            display: flex;
            flex-direction: column;
            background-color: white;"
    >
      <Popup
        open={isPopupVisible}
        onClose={handleClosePopup}
        placement="bottom"
        style={{ height: "30%" }}
        rounded
        lock
      >
        <View className="popupTitle">{"歌曲：" + popupSong?.name}</View>
        <View className="popupNextContainer" onClick={handlePopupNextClick}>
          <Play className="popupNextIcon" size="28px"></Play>
          <View className="popupNextText">下一首播放</View>
        </View>
        <View className="popupLikeContainer" onClick={handlePopupLikeClick}>
          <Like
            className="popupLikeIcon"
            size="28px"
            style={{ color: "#ff0000" }}
          ></Like>
          <View className="popupNextText">{"取消喜欢"}</View>
        </View>
      </Popup>

      <List
        style="
            width: 100%;
            flex: 1;"
        loading={loading}
        hasMore={hasMore}
        onLoad={() => {
          setLoading(true);
          setTimeout(() => {
            let length = list.length;
            for (
              let i = length;
              i < (items.length < length + 10 ? items.length : length + 10);
              i++
            ) {
              list.push(items[list.length]);
            }
            setList([...list]);
            setHasMore(list.length < items.length);
            setLoading(false);
          }, 1000);
        }}
      >
        {list.map((item, index) => (
          <SongContainerFav
            imgUrl={item.coverUrl}
            title={item.name}
            artist={item.artists}
            onClick={() => handleItemClick(item)}
            onIconClick={(event) => handleItemIconClick(item, index, event)}
          />
        ))}
        {showLoading ? (
          <List.Placeholder>
            {loading && <Loading>加载中...</Loading>}
            {!hasMore && "没有更多了"}
          </List.Placeholder>
        ):<></>}
        {/* 为音乐播放器留的空间 */}
        <List.Placeholder
          style="
                width: 100%;
                height: 20px;"
        ></List.Placeholder>
      </List>
    </View>
  );
}
