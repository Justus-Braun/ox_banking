import type { Character } from '../common/typings';
import targets from '../../data/targets.json';
import locations from '../../data/locations.json';
import atms from '../../data/atms.json';
import { hideTextUI } from '@overextended/ox_lib/client';
import { SendTypedNUIMessage, serverNuiCallback } from 'utils';
import { getLocales, locale } from '@overextended/ox_lib/shared';

import { OxAccountPermissions, OxAccountRole } from '@overextended/ox_core';

import {initLocale} from '@overextended/ox_lib/shared'
import { OxAccountPermissions, OxAccountRoles } from '@overextended/ox_core';
import { Vector3 } from '@nativewrappers/client';


const usingTarget = GetConvarInt('ox_banking:target', 0) === 1;
let hasLoadedUi = false;
let isUiOpen = false;
let isATMopen = false;

initLocale()

function initUI() {
  if (hasLoadedUi) return;

  const accountRoles: OxAccountRole[] = GlobalState.accountRoles;

  // @ts-expect-error
  const permissions: Record<OxAccountRoles, OxAccountPermissions> = {};

  accountRoles.forEach((role) => {
    permissions[role] = GlobalState[`accountRole.${role}`] as OxAccountPermissions;
  });

  SendNUIMessage({
    action: 'setInitData',
    data: {
      locales: getLocales(),
      permissions,
    },
  });

  hasLoadedUi = true;
}

const openATM = () => {
  initUI();

  isUiOpen = true;
  isATMopen = true;

  SendTypedNUIMessage('openATM', null);
  SetNuiFocus(true, true);
};

exports('openATM', openATM);

const openBank = () => {
  initUI();

  const playerCash: number = exports.ox_inventory.GetItemCount('money');
  isUiOpen = true;

  hideTextUI();

  SendTypedNUIMessage<Character>('openBank', { cash: playerCash });
  SetNuiFocus(true, true);
};

exports('openBank', openBank);

const createBankBlip = (coords: number[]) => {
  const blip = AddBlipForCoord(coords[0], coords[1], coords[2]);
  SetBlipSprite(blip, 207);
  SetBlipColour(blip, 2);
  SetBlipAsShortRange(blip, true);
  BeginTextCommandSetBlipName('STRING');
  AddTextComponentString(locale('bank'));
  EndTextCommandSetBlipName(blip);
};

if (!usingTarget) {
  for (let i = 0; i < locations.length; i++) createBankBlip(locations[i]);
}

if (usingTarget) {
  exports.sleepless_interact.addGlobalModel({
    models: [
      {model: "prop_fleeca_atm", offset: new Vector3(0, 0, 1.0)},
      {model: "prop_atm_01", offset: new Vector3(0, 0, 1.0)},
      {model: "prop_atm_02", offset: new Vector3(0, 0, 1.0)},
      {model: "prop_atm_03", offset: new Vector3(0, 0, 1.0)},
    ],
      id: 'access_atm',
      options: [
        {
          icon: 'fa-solid fa-money-check',
          label: locale('access_atm'),
          onSelect: (id: string | number, entity?: number, coords: Vector3, distance: number) => {
            openATM();
          },
        },
        {
          icon: 'fa-solid fa-sack-dollar',
          label: locale('rob_atm'),
          onSelect: (id: string | number, entity?: number, coords: Vector3, distance: number) => {
            openATM();
          },
        },
      ],
      renderDistance: 2.0,
      activeDistance: 1.0,
    }
  );

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];

    exports.sleepless_interact.addCoords({
      id: 'access_bank',
      coords: [
        new Vector3(149.7474, -1041.4419, 29.7),
        new Vector3(421.4, 567.8, 125.0),
        new Vector3(314.0676, -279.6146, 54.43),
        new Vector3(-351.0613, -50.4046, 49.30),
        new Vector3(-1212.3430, -331.1905, 38.05),
        new Vector3(248.485, 223.2904, 106.4085),
        new Vector3(-2962.0, 482.9439, 15.9852),
        new Vector3(1174.9997, 2707.3660, 38.4),
        new Vector3(-111.7381, 6469.452, 31.9485),
      ],
      // size: target.size,
      // rotation: target.rotation,
      // debug: true,
      renderDistance: 5.0,
      activeDistance: 1.3,
      options: [
        {
          icon: 'fa-solid fa-dollar-sign',
          label: locale('access_bank'),
          onSelect: (id: string | number, entity?: number, coords: Vector3, distance: number) => {
            openBank();
          },
        },
      ],
    });

    createBankBlip(target.coords);
  }
}

RegisterNuiCallback('exit', () => {
  isUiOpen = false;
  isATMopen = false;

  SetNuiFocus(false, false);
});

on('ox_inventory:itemCount', (itemName: string, count: number) => {
  if (!isUiOpen || isATMopen || itemName !== 'money') return;

  SendTypedNUIMessage<Character>('refreshCharacter', { cash: count });
});

serverNuiCallback('getDashboardData');
serverNuiCallback('transferOwnership');
serverNuiCallback('manageUser');
serverNuiCallback('removeUser');
serverNuiCallback('getAccountUsers');
serverNuiCallback('addUserToAccount');
serverNuiCallback('getAccounts');
serverNuiCallback('createAccount');
serverNuiCallback('deleteAccount');
serverNuiCallback('depositMoney');
serverNuiCallback('withdrawMoney');
serverNuiCallback('transferMoney');
serverNuiCallback('renameAccount');
serverNuiCallback('convertAccountToShared');
serverNuiCallback('getLogs');
serverNuiCallback('getInvoices');
serverNuiCallback('payInvoice');
