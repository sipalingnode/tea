'use strict';
import React, {useEffect, useState} from 'react';
import { Text } from 'ink';
import Table from 'ink-table';
import { t } from 'saihubot-cli-adapter/dist/i18n';

import {getConfig, xdaiFetch} from './utils';
import {rpcLastBlock, rpcEthBalance, rpcTokenBalance} from './ethRpc';
import {i18nAddr} from './i18n';
import {xdaiTokenMap} from './token';

const i18nXdai = {
  'en': {
    fetching: 'Fetching xDai data...',
    query: 'Query balance on xDai Chain...',
    summary: 'The latest xDai block is **{{blocknum}}**',
  },
  'zh_TW': {
    fetching: '取得 xDai 資料中...',
    query: '查詢 xDai 網路餘額中...',
    summary: '最新的xDai區塊是 **{{blocknum}}**',
  },
  props: ['blocknum']
}

/**
 * Check address or tx on xDai.
 *
 * can pass the address, or pre-define the
 * SAIHUBOT_ADDR environment variable
 */
export const skillSearchXDai = {
  name: 'xdai',
  help: '🏦xdai [address|tx] - check address or tx on xDai Chain',
  requirements: {
    addons: ['search'],
  },
  rule: /(^xdai )(.*)|^xdai$/i,
  action: function(robot, msg) {
    let addr = '';
    if (msg[2] === undefined) {
      addr = getConfig('ADDR', '');
      if (addr === '') {
        robot.send(t('needAddr', {i18n: i18nAddr}));
        robot.render();
        return;
      }
    }
    const data = addr || msg[2];
    if(isAddr(data)) {
      const url = 'https://blockscout.com/poa/xdai/address/' + data + '/tokens';
      robot.addons.search('Check', data, url, 'xDai');
    } else {
      const url = 'https://blockscout.com/poa/xdai/tx/' + data + '/internal-transactions';
      robot.addons.search('Check tx', data, url, 'xDai Chain');
    }
  },
};


/**
 * Get the latest block number.
 */
export const skillLastXdaiBlock = {
  name: 'lastblock-xdai',
  help: 'lastblock-xdai|lastblockxdai|block-xdai|blockxdai - get the latest xDai block number',
  requirements: {
    addons: ['fetch'],
  },
  rule: /^(last)?block-?xdai$/i,
  action: function(robot, msg) {
    robot.send(t('fetching', {i18n: i18nXdai}));
    robot.render();
    xdaiFetch(robot.addons.fetch, rpcLastBlock)
      .then(json => {
        const msg = t('summary', {i18n: i18nXdai, blocknum: parseInt(json.result)});
        robot.send(msg);
        robot.render();
      });
  },
}

export const XdaiBalances = ({addresses, fetch}) => {
  const [balance, setBalance] = useState([]);
  const [loading, setLoading] = useState(true);
  const data = [];
  useEffect(() => {
    async function fetchXdaiBalance() {
      const tokens = Object.keys(xdaiTokenMap);

      for (let i = 0; i < addresses.length ; i++) {
        const json = await xdaiFetch(fetch, rpcEthBalance(addresses[i]))
        const val = json.result === 0x0 ? 0 : Number(json.result)/10**18;
        if (val > 0) {
          data.push({
            Symbol: 'xDai',
            Balance: val,
            [t('source', {i18n: balanceI18n})]: '',
          });
        }

        for(let j = 0; j < tokens.length; j++) {
          const currentTokenAddr = tokens[j];
          const tokenInfo = xdaiTokenMap[currentTokenAddr];
          const tokenJson = await xdaiFetch(fetch, rpcTokenBalance(addresses[i], currentTokenAddr));
          if (tokenJson.result !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
            data.push({
              Symbol: tokenInfo.symbol,
              Balance: Number(tokenJson.result) / 10 ** tokenInfo.decimals,
              [t('source', {i18n: balanceI18n})]: '',
            });
          }
        }
      }
      setBalance([...balance, ...data]);
      setLoading(false);
    }

    addresses && fetchXdaiBalance();
  }, [addresses, fetch]);

  if (loading) {
    return (<Text>{t('query', {i18n: i18nXdai})}</Text>)
  }

  return balance.length > 0
    ? (<>
      <Text>{t('xdaiBalance', {i18n: i18nXdai})}</Text>
      <Table data={balance} />
      <Text> </Text>
    </>)
    : null
}

/**
 * Get balance of [addr] on xDai Chain.
 *
 * can pass the address, or pre-define the
 * SAIHUBOT_ADDR environment variable
 */
export const skillGetXdaiBlance = {
  name: 'balance-xdai',
  help: '💰balance-xdai - Show address balance on xDai chain',
  requirements: {
    addons: ['fetch'],
  },
  rule: /(^balance-xdai )(.*)|^balance-xdai$/i,
  action: function(robot, msg) {
    let addr = '';
    if (msg[2] === undefined) {
      addr = getConfig('ADDR', '');
      if (!addr) {
        robot.send(t('needAddr', {i18n: balanceI18n}));
        robot.render();
        return;
      }
    }
    const parsedAddr = addr || parseArg(msg[2]);
    robot.sendComponent(<XdaiBalances address={parsedAddr} fetch={robot.addons.fetch} />);
    robot.render();
  },
}

const skills = [
  skillLastXdaiBlock,
  skillGetXdaiBlance,
  skillSearchXDai,
];
export {skills};
