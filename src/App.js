// @ts-check
import { useRef, useState, useEffect } from "react";
import {
  createChart,
  CrosshairMode,
  PriceScaleMode,
  LineStyle
} from "lightweight-charts";
import { saveAs } from "file-saver";
import moment from "moment";
import "./styles.scss";

const width = 928;
const height = 400;
const minimapHeight = 60;
const maxPointPerPixel = 1770 / 1000; // 1000 pixel can display maxium 1770 point

const useStaticState = (defaultValue = null) => {
  const staticState = useRef(defaultValue);

  const setValue = (value) => {
    staticState.current = value;
  };

  return [() => staticState.current, setValue];
};

const setValueBetween = (value, range) => {
  if (value < range[0]) {
    return range[0];
  }

  if (value > range[1]) {
    return range[1];
  }

  return value;
};

const ChartViewer = () => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [data, setData] = useState([]);
  const minimapRef = useRef(null);
  const minimapWrapperRef = useRef(null);
  const minimapInstance = useRef(null);
  const rangerRef = useRef(null);
  const [leftPosition, setLeftPosition] = useStaticState(0);
  const [rightPosition, setRightPosition] = useStaticState(0);
  const [isDraging, setIsDraging] = useStaticState(false);
  const [pageX, setPageX] = useStaticState(null);
  const [priceScale, setPriceScale] = useState(PriceScaleMode.Normal);

  useEffect(() => {
    loadData();
  }, []);

  // Minimap
  useEffect(() => {
    const chart = createChart(minimapRef.current, {
      width,
      height: minimapHeight,
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: false,
        horzTouchDrag: false,
        vertTouchDrag: false
      },
      leftPriceScale: {
        visible: false
      },
      rightPriceScale: {
        visible: false
      },
      timeScale: {
        borderVisible: false
      },
      layout: {
        fontFamily: "Inter",
        fontSize: 11,
        textColor: "#808A9D",
        backgroundColor: "transparent"
      },
      grid: {
        vertLines: {
          color: "#EFF2F5"
        },
        horzLines: {
          visible: false
        }
      },
      crosshair: {
        vertLine: {
          visible: false
        },
        horzLine: {
          visible: false
        }
      }
    });

    minimapInstance.current = chart;
    window.minimap = chart;

    const lineSeries = chart.addLineSeries({
      lineWidth: 1,
      color: "#4878FF",
      priceScaleId: "left",
      priceLineVisible: false,
      lastValueVisible: false
    });
    chart.timeScale().fitContent();
    const dataReduced = data.filter((point, index) => index % 2); // Reduce point for minimap

    lineSeries.setData(dataReduced);

    if (minimapRef.current) {
      // Portal the
    }

    return () => {
      chart.remove();
    };
  }, [data]);

  useEffect(() => {
    const chart = createChart(chartRef.current, {
      width,
      height,
      priceScale: {
        mode: priceScale
      },
      leftPriceScale: {
        visible: true,
        borderColor: "#EFF2F5",
        drawTicks: false,
        mode: priceScale,
        entireTextOnly: true
      },
      rightPriceScale: {
        visible: true,
        borderColor: "#EFF2F5",
        drawTicks: false,
        mode: priceScale,
        entireTextOnly: true
      },
      timeScale: {
        fixLeftEdge: true,
        fixRightEdge: true,
        borderColor: "#EFF2F5"
      },
      layout: {
        fontFamily: "Inter",
        fontSize: 11,
        textColor: "#808A9D",
        backgroundColor: "transparent"
      },
      // watermark: {
      //   color: "#CFD6E4",
      //   visible: true,
      //   text: "CoinMarketCap",
      //   fontSize: 24,
      //   horzAlign: "left",
      //   vertAlign: "top",
      // },
      grid: {
        vertLines: {
          visible: false
        },
        horzLines: {
          color: "#EFF2F5"
        }
      },
      crosshair: {
        vertLine: {
          color: "#A6B0C3",
          labelBackgroundColor: "#808A9D",
          style: LineStyle.Dashed
        },
        horzLine: {
          color: "#A6B0C3",
          labelBackgroundColor: "#808A9D",
          style: LineStyle.Dashed
        },
        mode: CrosshairMode.Normal
      }
    });

    chartInstance.current = chart;
    window.chart = chart;

    const lineSeries = chart.addLineSeries({
      lineWidth: 2,
      color: "#16c784",
      priceScaleId: "left",
      priceLineVisible: false,
      lastValueVisible: false
    });
    lineSeries.setData(data);

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: {
        type: "volume"
      },
      priceLineVisible: false,
      baseLineVisible: false,
      color: "#CFD6E4",
      priceScaleId: "",
      lastValueVisible: false,
      scaleMargins: {
        top: 0.85,
        bottom: 0
      }
    });
    volumeSeries.setData(
      data.map(({ time, volume }) => ({ time, value: volume }))
    );

    const lineBTCSeries = chart.addLineSeries({
      lineWidth: 2,
      color: "#FFBB1F",
      priceScaleId: "right",
      priceLineVisible: false,
      lastValueVisible: false
    });
    lineBTCSeries.setData(data.map(({ time, btc }) => ({ time, value: btc })));

    const toolTip = document.querySelector(".floating-tooltip-2");
    const container = {
      clientWidth: 1000
    };
    const toolTipWidth = 300;
    const toolTipHeight = 120;
    const toolTipMarginVertical = 60;
    const toolTipMarginHorizontal = 60;

    chart.subscribeCrosshairMove(function (param) {
      if (
        param.point === undefined ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > container.clientWidth ||
        param.point.y < 0 ||
        param.point.y > container.clientHeight
      ) {
        toolTip.style.display = "none";
      } else {
        const date = moment.unix(param.time);
        toolTip.style.display = "block";
        const price = param.seriesPrices.get(lineSeries);
        const volume = param.seriesPrices.get(volumeSeries);
        const priceBTC = param.seriesPrices.get(lineBTCSeries);
        toolTip.innerHTML = `
          <div class="date">
            <span class="primary">
              ${date.format("ddd. MMM DD, YYYY")}
            </span>
            <span class="sub">
              ${date.format("hh:mm:ss,	UTC Z")}
            </span>
          </div>
          <div>
            <span class="indicator" style="background-color: #16c784"></span>
            <span class="sub">Price:</span> <span class="number">$${price}</span>
          </div>
          <div>
            <span class="indicator" style="background-color: #FFBB1F"></span>
            <span class="sub">Price (BTC):</span> <span class="number">$${priceBTC}</span>
          </div>
          <div>
            <img src="/volume.svg" class="volume-legend" />
            <span class="sub">Volume:</span> <span class="number">$${volume}</span>
          </div>
        `;

        let left = param.point.x + toolTipMarginVertical + 20;
        if (left > width - toolTipWidth) {
          left = param.point.x - toolTipMarginVertical - toolTipWidth + 110; // 40 for margin axis
        }

        let top = param.point.y + toolTipMarginHorizontal + 60;
        if (top > height - toolTipHeight) {
          top = param.point.y - toolTipHeight - toolTipMarginHorizontal + 150; // 90 for margin axis
        }
        toolTip.style.left = left + "px";
        toolTip.style.top = top + "px"; // 20 for margin axis
      }
    });

    // Auto fit the contents of the content
    chart.timeScale().fitContent();

    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      fromLogicalRangeToPixel(range);
    });

    return () => {
      chart.remove();
    };
  }, [data]);

  const hanldeCapture = () => {
    if (chartInstance?.current) {
      // TODO: Change the background based on the theme
      chartInstance.current.applyOptions({
        layout: {
          backgroundColor: "white"
        }
      });
      const canvas = chartInstance?.current.takeScreenshot();
      const context = canvas.getContext("2d");
      let base_image = new Image();
      base_image.src =
        "https://s2.coinmarketcap.com/static/cloud/img/chart/watermark.svg";
      base_image.crossOrigin = "anonymous";
      base_image.onload = function () {
        const pixelRatio = window?.devicePixelRatio || 1;
        context.drawImage(
          base_image,
          80 * pixelRatio,
          20 * pixelRatio,
          140 * pixelRatio,
          24 * pixelRatio
        );
        canvas.toBlob((blob) => {
          saveAs(blob);
          chartInstance.current.applyOptions({
            layout: {
              backgroundColor: "transparent"
            }
          });
        }, "png");
      };

      // https://s2.coinmarketcap.com/static/cloud/img/chart/watermark.svg
    }

    console.log(chartInstance);
  };

  const handleChangeTimeFrame = (range) => {
    loadData(range);
  };

  const loadData = (range = "ALL") => {
    fetch(
      `https://api.coinmarketcap.com/data-api/v3/cryptocurrency/detail/chart?id=1027&range=${range}`
    )
      .then((response) => response.json())
      .then((response) => {
        const points = Object.keys(response.data.points).map((time) => {
          const point = response.data.points[time];
          return {
            time: Number(time),
            value: point.v[0],
            volume: point.v[1],
            btc: point.v[3]
          };
        });

        setData(points);
      });
  };

  const handleTooglePriceScale = () => {
    if (priceScale === PriceScaleMode.Normal) {
      setPriceScale(PriceScaleMode.Logarithmic);
      return;
    }

    setPriceScale(PriceScaleMode.Normal);
    return;
  };

  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.applyOptions({
        priceScale: {
          mode: priceScale
        }
      });
    }
  }, [priceScale]);

  const handlePointerMove = (e) => {
    // console.log(e);
    e.preventDefault();
    if (!isDraging()) {
      return;
    }

    const movementX = pageX() ? e.pageX - pageX() : 0;
    setPageX(e.pageX);

    const dragHandler = isDraging();
    const maxRangeWidth = ((width * maxPointPerPixel) / data.length) * width;
    const shouldMove =
      dragHandler === "move" ||
      rangerRef.current.clientWidth - movementX > maxRangeWidth;

    // Prevent move to the edge make the range smaller
    if (shouldMove && leftPosition() + movementX <= 0) {
      return;
    }

    if (shouldMove && rightPosition() - movementX <= 0) {
      return;
    }

    // Normal drag
    if (dragHandler === "left" || shouldMove) {
      setLeftPosition(setValueBetween(leftPosition() + movementX, [0, width]));
    }
    if (dragHandler === "right" || shouldMove) {
      setRightPosition(
        setValueBetween(rightPosition() - movementX, [0, width])
      );
    }

    const left = leftPosition();
    const right = rightPosition();
    // Cover drag over case
    if (dragHandler !== "move" && left + right > width) {
      dragHandler === "left"
        ? setLeftPosition(width - right)
        : setRightPosition(width - left);
      setIsDraging(dragHandler === "left" ? "right" : "left");
    }

    rangerRef.current.style.left = leftPosition() + "px";
    rangerRef.current.style.right = rightPosition() + "px";
  };

  const handleStartMoveRange = (e) => {
    if (!isDraging()) {
      setIsDraging("move");
    }
    e.preventDefault();
    e.stopPropagation();
  };

  const handlePointerDown = (e, side) => {
    if (!isDraging()) {
      setIsDraging(side);
    }
    e.preventDefault();
    e.stopPropagation();
  };

  const handlePointerUp = (e) => {
    if (!isDraging()) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    setIsDraging(null);
    setPageX(null);

    fromPixelRangeToLogical({ left: leftPosition(), right: rightPosition() });
  };

  const fromLogicalRangeToPixel = ({ from, to }) => {
    const totalPoint = data.length;

    const left = setValueBetween((width / totalPoint) * from, [0, width]);
    const right = setValueBetween(width - (width / totalPoint) * to, [
      0,
      width
    ]);

    requestAnimationFrame(() => {
      setLeftPosition(left);
      setRightPosition(right);
      rangerRef.current.style.left = left + "px";
      rangerRef.current.style.right = right + "px";
    });
  };

  const fromPixelRangeToLogical = ({ left, right }) => {
    const totalPoint = data.length;
    const from = left / (width / totalPoint);
    const to = -(right - width) / (width / totalPoint);

    requestAnimationFrame(() => {
      if (chartInstance.current) {
        chartInstance.current.timeScale().setVisibleLogicalRange({ from, to });
      }
    });
  };

  return (
    <div className="chart-wrapper">
      <h2>Ethereum chart</h2>

      <button onClick={hanldeCapture}>Screenshot</button>
      <button onClick={() => handleChangeTimeFrame("1D")}>1D</button>
      <button onClick={() => handleChangeTimeFrame("1M")}>1M</button>
      <button onClick={() => handleChangeTimeFrame("3M")}>3M</button>
      <button onClick={() => handleChangeTimeFrame("1Y")}>1Y</button>
      <button onClick={() => handleChangeTimeFrame("YTD")}>YTD</button>
      <button onClick={() => handleChangeTimeFrame("ALL")}>ALL</button>
      <button onClick={handleTooglePriceScale}>LOG</button>
      <hr />
      <div className="floating-tooltip-2"></div>
      <div>
        <div className="chart-wrapper">
          <img
            className="watermark"
            src="https://s2.coinmarketcap.com/static/cloud/img/chart/watermark.svg"
          />
          <div className="chart" ref={chartRef}></div>
        </div>
        <div
          className="minimap-wrapper"
          style={{ width, height: minimapHeight }}
          onPointerMove={handlePointerMove}
          onPointerDown={handleStartMoveRange}
          onPointerLeave={handlePointerUp}
          onPointerUp={handlePointerUp}
        >
          <div className="range-selector" ref={rangerRef}>
            <div
              onPointerDown={(e) => handlePointerDown(e, "left")}
              onPointerUp={handlePointerUp}
              className="handler first"
              draggable
            >
              <img
                src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjMiIGhlaWdodD0iMzMiIHZpZXdCb3g9IjAgMCAyMyAzMyIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZyBmaWx0ZXI9InVybCgjZmlsdGVyMF9kZCkiPgogIDxyZWN0IHg9IjQuOTQ2MjkiIHk9IjEuOTk5NTEiIHdpZHRoPSIxNCIgaGVpZ2h0PSIyNSIgcng9IjciIGZpbGw9IndoaXRlIi8+CiAgPC9nPgogIDxwYXRoIGZpbGxSdWxlPSJldmVub2RkIiBjbGlwUnVsZT0iZXZlbm9kZCIgZD0iTTEwLjk0NjMgMTAuNDk5NUMxMC45NDYzIDEwLjIyMzQgMTAuNzIyNCA5Ljk5OTUxIDEwLjQ0NjMgOS45OTk1MUMxMC4xNzAxIDkuOTk5NTEgOS45NDYyOSAxMC4yMjM0IDkuOTQ2MjkgMTAuNDk5NVYxOC41MDA3QzkuOTQ2MjkgMTguNzc2OSAxMC4xNzAxIDE5LjAwMDcgMTAuNDQ2MyAxOS4wMDA3QzEwLjcyMjQgMTkuMDAwNyAxMC45NDYzIDE4Ljc3NjkgMTAuOTQ2MyAxOC41MDA3VjEwLjQ5OTVaTTEzLjk0NjMgMTAuNDk5NUMxMy45NDYzIDEwLjIyMzQgMTMuNzIyNCA5Ljk5OTUxIDEzLjQ0NjMgOS45OTk1MUMxMy4xNzAxIDkuOTk5NTEgMTIuOTQ2MyAxMC4yMjM0IDEyLjk0NjMgMTAuNDk5NVYxOC41MDA3QzEyLjk0NjMgMTguNzc2OSAxMy4xNzAxIDE5LjAwMDcgMTMuNDQ2MyAxOS4wMDA3QzEzLjcyMjQgMTkuMDAwNyAxMy45NDYzIDE4Ljc3NjkgMTMuOTQ2MyAxOC41MDA3VjEwLjQ5OTVaIiBmaWxsPSIjQTZCMEMzIi8+CiAgPGRlZnM+CiAgPGZpbHRlciBpZD0iZmlsdGVyMF9kZCIgeD0iMC45NDYyODkiIHk9Ii0wLjAwMDQ4ODI4MSIgd2lkdGg9IjIyIiBoZWlnaHQ9IjMzIiBmaWx0ZXJVbml0cz0idXNlclNwYWNlT25Vc2UiIGNvbG9yLWludGVycG9sYXRpb24tZmlsdGVycz0ic1JHQiI+CiAgPGZlRmxvb2QgZmxvb2Qtb3BhY2l0eT0iMCIgcmVzdWx0PSJCYWNrZ3JvdW5kSW1hZ2VGaXgiLz4KICA8ZmVDb2xvck1hdHJpeCBpbj0iU291cmNlQWxwaGEiIHR5cGU9Im1hdHJpeCIgdmFsdWVzPSIwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAxMjcgMCIvPgogIDxmZU9mZnNldCBkeT0iMiIvPgogIDxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249IjIiLz4KICA8ZmVDb2xvck1hdHJpeCB0eXBlPSJtYXRyaXgiIHZhbHVlcz0iMCAwIDAgMCAwLjM0NTA5OCAwIDAgMCAwIDAuNCAwIDAgMCAwIDAuNDk0MTE4IDAgMCAwIDAuMTIgMCIvPgogIDxmZUJsZW5kIG1vZGU9Im5vcm1hbCIgaW4yPSJCYWNrZ3JvdW5kSW1hZ2VGaXgiIHJlc3VsdD0iZWZmZWN0MV9kcm9wU2hhZG93Ii8+CiAgPGZlQ29sb3JNYXRyaXggaW49IlNvdXJjZUFscGhhIiB0eXBlPSJtYXRyaXgiIHZhbHVlcz0iMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMTI3IDAiLz4KICA8ZmVPZmZzZXQgZHk9IjEiLz4KICA8ZmVHYXVzc2lhbkJsdXIgc3RkRGV2aWF0aW9uPSIwLjUiLz4KICA8ZmVDb2xvck1hdHJpeCB0eXBlPSJtYXRyaXgiIHZhbHVlcz0iMCAwIDAgMCAwLjM0NTA5OCAwIDAgMCAwIDAuNCAwIDAgMCAwIDAuNDk0MTE4IDAgMCAwIDAuMTIgMCIvPgogIDxmZUJsZW5kIG1vZGU9Im5vcm1hbCIgaW4yPSJlZmZlY3QxX2Ryb3BTaGFkb3ciIHJlc3VsdD0iZWZmZWN0Ml9kcm9wU2hhZG93Ii8+CiAgPGZlQmxlbmQgbW9kZT0ibm9ybWFsIiBpbj0iU291cmNlR3JhcGhpYyIgaW4yPSJlZmZlY3QyX2Ryb3BTaGFkb3ciIHJlc3VsdD0ic2hhcGUiLz4KICA8L2ZpbHRlcj4KICA8L2RlZnM+Cjwvc3ZnPgo="
                width="18"
                height="25"
              />
            </div>
            <div
              onPointerDown={(e) => handlePointerDown(e, "right")}
              className="handler second"
              draggable
            >
              <img
                src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjMiIGhlaWdodD0iMzMiIHZpZXdCb3g9IjAgMCAyMyAzMyIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZyBmaWx0ZXI9InVybCgjZmlsdGVyMF9kZCkiPgogIDxyZWN0IHg9IjQuOTQ2MjkiIHk9IjEuOTk5NTEiIHdpZHRoPSIxNCIgaGVpZ2h0PSIyNSIgcng9IjciIGZpbGw9IndoaXRlIi8+CiAgPC9nPgogIDxwYXRoIGZpbGxSdWxlPSJldmVub2RkIiBjbGlwUnVsZT0iZXZlbm9kZCIgZD0iTTEwLjk0NjMgMTAuNDk5NUMxMC45NDYzIDEwLjIyMzQgMTAuNzIyNCA5Ljk5OTUxIDEwLjQ0NjMgOS45OTk1MUMxMC4xNzAxIDkuOTk5NTEgOS45NDYyOSAxMC4yMjM0IDkuOTQ2MjkgMTAuNDk5NVYxOC41MDA3QzkuOTQ2MjkgMTguNzc2OSAxMC4xNzAxIDE5LjAwMDcgMTAuNDQ2MyAxOS4wMDA3QzEwLjcyMjQgMTkuMDAwNyAxMC45NDYzIDE4Ljc3NjkgMTAuOTQ2MyAxOC41MDA3VjEwLjQ5OTVaTTEzLjk0NjMgMTAuNDk5NUMxMy45NDYzIDEwLjIyMzQgMTMuNzIyNCA5Ljk5OTUxIDEzLjQ0NjMgOS45OTk1MUMxMy4xNzAxIDkuOTk5NTEgMTIuOTQ2MyAxMC4yMjM0IDEyLjk0NjMgMTAuNDk5NVYxOC41MDA3QzEyLjk0NjMgMTguNzc2OSAxMy4xNzAxIDE5LjAwMDcgMTMuNDQ2MyAxOS4wMDA3QzEzLjcyMjQgMTkuMDAwNyAxMy45NDYzIDE4Ljc3NjkgMTMuOTQ2MyAxOC41MDA3VjEwLjQ5OTVaIiBmaWxsPSIjQTZCMEMzIi8+CiAgPGRlZnM+CiAgPGZpbHRlciBpZD0iZmlsdGVyMF9kZCIgeD0iMC45NDYyODkiIHk9Ii0wLjAwMDQ4ODI4MSIgd2lkdGg9IjIyIiBoZWlnaHQ9IjMzIiBmaWx0ZXJVbml0cz0idXNlclNwYWNlT25Vc2UiIGNvbG9yLWludGVycG9sYXRpb24tZmlsdGVycz0ic1JHQiI+CiAgPGZlRmxvb2QgZmxvb2Qtb3BhY2l0eT0iMCIgcmVzdWx0PSJCYWNrZ3JvdW5kSW1hZ2VGaXgiLz4KICA8ZmVDb2xvck1hdHJpeCBpbj0iU291cmNlQWxwaGEiIHR5cGU9Im1hdHJpeCIgdmFsdWVzPSIwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAxMjcgMCIvPgogIDxmZU9mZnNldCBkeT0iMiIvPgogIDxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249IjIiLz4KICA8ZmVDb2xvck1hdHJpeCB0eXBlPSJtYXRyaXgiIHZhbHVlcz0iMCAwIDAgMCAwLjM0NTA5OCAwIDAgMCAwIDAuNCAwIDAgMCAwIDAuNDk0MTE4IDAgMCAwIDAuMTIgMCIvPgogIDxmZUJsZW5kIG1vZGU9Im5vcm1hbCIgaW4yPSJCYWNrZ3JvdW5kSW1hZ2VGaXgiIHJlc3VsdD0iZWZmZWN0MV9kcm9wU2hhZG93Ii8+CiAgPGZlQ29sb3JNYXRyaXggaW49IlNvdXJjZUFscGhhIiB0eXBlPSJtYXRyaXgiIHZhbHVlcz0iMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMTI3IDAiLz4KICA8ZmVPZmZzZXQgZHk9IjEiLz4KICA8ZmVHYXVzc2lhbkJsdXIgc3RkRGV2aWF0aW9uPSIwLjUiLz4KICA8ZmVDb2xvck1hdHJpeCB0eXBlPSJtYXRyaXgiIHZhbHVlcz0iMCAwIDAgMCAwLjM0NTA5OCAwIDAgMCAwIDAuNCAwIDAgMCAwIDAuNDk0MTE4IDAgMCAwIDAuMTIgMCIvPgogIDxmZUJsZW5kIG1vZGU9Im5vcm1hbCIgaW4yPSJlZmZlY3QxX2Ryb3BTaGFkb3ciIHJlc3VsdD0iZWZmZWN0Ml9kcm9wU2hhZG93Ii8+CiAgPGZlQmxlbmQgbW9kZT0ibm9ybWFsIiBpbj0iU291cmNlR3JhcGhpYyIgaW4yPSJlZmZlY3QyX2Ryb3BTaGFkb3ciIHJlc3VsdD0ic2hhcGUiLz4KICA8L2ZpbHRlcj4KICA8L2RlZnM+Cjwvc3ZnPgo="
                width="18"
                height="25"
              />
            </div>
          </div>
          <div className="minimap" ref={minimapRef}></div>
        </div>
      </div>
    </div>
  );
};

export default ChartViewer;
