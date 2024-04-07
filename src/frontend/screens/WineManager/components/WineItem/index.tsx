import './index.css'

import React, { useEffect, useState } from 'react'

import { WineVersionInfo, ProgressInfo, State } from 'common/types'
import DownIcon from 'frontend/assets/down-icon.svg?react'
import StopIcon from 'frontend/assets/stop-icon.svg?react'
import { faRepeat, faFolderOpen } from '@fortawesome/free-solid-svg-icons'
import { SvgButton } from 'frontend/components/UI'
import { useTranslation } from 'react-i18next'

import { notify, size } from 'frontend/helpers'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

const WineItem = ({
  version,
  date,
  downsize,
  disksize,
  download,
  checksum,
  isInstalled,
  hasUpdate,
  installDir,
  type
}: WineVersionInfo) => {
  const { t } = useTranslation()
  const [progress, setProgress] = useState<{
    state: State
    progress: ProgressInfo
  }>({
    state: 'idle',
    progress: { percentage: 0, avgSpeed: 0, eta: '00:00:00' }
  })

  useEffect(() => {
    if (version) {
      const removeWineManagerDownloadListener =
        window.api.handleProgressOfWineManager(
          version,
          (
            e: Electron.IpcRendererEvent,
            progress: {
              state: State
              progress: ProgressInfo
            }
          ) => {
            setProgress(progress)
          }
        )
      return removeWineManagerDownloadListener
    }
    /* eslint-disable @typescript-eslint/no-empty-function */
    return () => {}
  }, [])

  if (!version || !downsize) {
    return null
  }

  const isDownloading = progress.state === 'downloading'
  const unZipping = progress.state === 'unzipping'

  async function install() {
    notify({ title: `${version}`, body: t('notify.install.startInstall') })
    setProgress({
      state: 'downloading',
      progress: { percentage: 0, avgSpeed: 0, eta: '00:00:00' }
    })
    window.api
      .installWineVersion({
        version,
        date,
        downsize,
        disksize,
        download,
        checksum,
        isInstalled,
        hasUpdate,
        type,
        installDir
      })
      .then((response) => {
        switch (response) {
          case 'error':
            notify({ title: `${version}`, body: t('notify.install.error') })
            break
          case 'abort':
            notify({ title: `${version}`, body: t('notify.install.canceled') })
            break
          case 'success':
            notify({ title: `${version}`, body: t('notify.install.finished') })
            break
          default:
            break
        }

        setProgress({
          state: 'idle',
          progress: { percentage: 0, avgSpeed: 0, eta: '00:00:00' }
        })
      })
  }

  async function remove() {
    window.api
      .removeWineVersion({
        version,
        date,
        downsize,
        disksize,
        download,
        checksum,
        isInstalled,
        hasUpdate,
        installDir,
        type
      })
      .then((response) => {
        if (response) {
          notify({ title: `${version}`, body: t('notify.uninstalled') })
        }
      })
  }

  function openInstallDir() {
    installDir !== undefined ? window.api.showItemInFolder(installDir) : {}
  }

  const renderStatus = () => {
    let status
    if (isDownloading) {
      status = getProgressElement(progress.progress)
    } else if (unZipping) {
      status = t('wine.manager.unzipping', 'Unzipping')
    } else if (isInstalled) {
      status = size(disksize)
    } else {
      status = size(downsize)
    }
    return status
  }

  // using one element for the different states so it doesn't
  // lose focus from the button when using a game controller
  const handleMainActionClick = () => {
    if (isDownloading || unZipping) {
      window.api.abort(version)
    } else if (isInstalled) {
      remove()
    } else {
      install()
    }
  }

  const mainActionIcon = () => {
    if (isInstalled || isDownloading || unZipping) {
      return <StopIcon />
    } else {
      return <DownIcon className="downIcon" />
    }
  }

  const mainIconTitle = () => {
    if (isDownloading || unZipping) {
      return `Cancel ${version} ${hasUpdate ? 'update' : 'installation'}`
    } else if (isInstalled) {
      return `Uninstall ${version}`
    } else {
      return `Install ${version}`
    }
  }

  return (
    <div className="wineManagerListItem">
      <span className="wineManagerTitleList">{version}</span>
      <div className="wineManagerListDate">{date}</div>
      <div className="wineManagerListSize">{renderStatus()}</div>
      <span className="icons">
        {isInstalled && (
          <SvgButton
            className="material-icons settings folder"
            onClick={openInstallDir}
            title={`Open containing folder for ${version}`}
          >
            <FontAwesomeIcon
              icon={faFolderOpen}
              data-testid="setinstallpathbutton"
            />
          </SvgButton>
        )}

        {hasUpdate && (
          <SvgButton
            className="material-icons settings folder"
            onClick={install}
            title={`Update ${version}`}
          >
            <FontAwesomeIcon
              icon={faRepeat}
              data-testid="setinstallpathbutton"
            />
          </SvgButton>
        )}

        <SvgButton onClick={handleMainActionClick} title={mainIconTitle()}>
          {mainActionIcon()}
        </SvgButton>
      </span>
    </div>
  )
}

function getProgressElement(progress: ProgressInfo) {
  const { percentage, eta } = progress

  const percentageAsString = `${percentage.toFixed(2)}%`
  const etaAsString = `${eta}`
  return (
    <p className="progress">
      {percentageAsString}
      <br />({etaAsString})
    </p>
  )
}

export default WineItem
