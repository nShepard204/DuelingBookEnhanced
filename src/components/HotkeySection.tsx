import React, { useEffect, useRef, useState } from "react";
import { loadHotkeysConfig, saveHotkeysConfig } from "../utilities/configUtility";
import { validHotkeys } from "../data/validHotkeys";

interface HotkeySectionProps {
  title: string;
  actions: string[];
  selectedHotkeys: { [key: string]: string };
  setSelectedHotkeys: (hotkeys: { [key: string]: string }) => void;
  resetCounter: number;
  toggleSavedMessage: () => void;
}

export const HotkeySection: React.FC<HotkeySectionProps> = ({ title, actions, selectedHotkeys, setSelectedHotkeys, resetCounter, toggleSavedMessage }) => {
  const [isHotkeyInvalid, setIsHotkeyInvalid] = useState(false)
  const [conflictState, setConflictState] = useState<ConflictState>({ action: '', hotkey: '' });

  type ConflictState = {
    action: string;
    hotkey: string;
  };

  const selectRefs = useRef<{ [key: string]: React.RefObject<HTMLSelectElement> }>({});

  actions.forEach(action => {
    if (!selectRefs.current[action]) {
      selectRefs.current[action] = React.createRef();
    }
  });

  useEffect(() => {
    async function loadAndLogHotkeys() {
      const currentHotkeys = await loadHotkeysConfig();
      console.log('current hotkeys', currentHotkeys);
    }
    loadAndLogHotkeys();
  }, [resetCounter]);

  useEffect(() => {
    async function initializeSelectedHotkeys() {
      try {
        const currentHotkeys = await loadHotkeysConfig();
        console.log('current hotkeys', currentHotkeys);

        const initialSelectedHotkeys: { [key: string]: string } = {};
        actions.forEach((action) => {
          const hotkey = findHotkeyByAction(action, currentHotkeys);
          initialSelectedHotkeys[action] = hotkey;
        });

        setSelectedHotkeys(initialSelectedHotkeys);
      } catch (error) {
        console.error('Error loading hotkeys:', error);
      }
    }

    initializeSelectedHotkeys();
  }, [actions, resetCounter]);

  const handleHotkeyChange = async (action: string, hotkey: string) => {
    try {
      const currentHotkeys = await loadHotkeysConfig();

      // check if the new hotkey is already assigned to another action.
      const alreadyMappedAction = currentHotkeys.find(hotkeyItem => hotkeyItem.hotkey === hotkey);
      if (alreadyMappedAction && hotkey !== '') {
        setIsHotkeyInvalid(true)
        setConflictState({ action: `${alreadyMappedAction.action}`, hotkey: `${hotkey}` });

        console.log(`The hotkey: ${hotkey} is already mapped to the action ${alreadyMappedAction.action}`);

        setSelectedHotkeys({
          ...selectedHotkeys,
          [action]: currentHotkeys.find(hotkey => hotkey.action === action)?.hotkey || ''
        });

        return;
      }

      const actionParts = action.split('/');
      const actions = [];

      if (actionParts.length > 1) {
        actions.push(...actionParts);
      } else {
        actions.push(action);
      }

      const updatedSelectedHotkeys = { ...selectedHotkeys };

      for (const hotkeyItem of currentHotkeys) {
        if (actions.includes(hotkeyItem.action)) {
          updatedSelectedHotkeys[hotkeyItem.action] = hotkeyItem.hotkey;
        }

        for (const hotkeyItem of currentHotkeys) {
          if (actions.includes(hotkeyItem.action)) {
            hotkeyItem.hotkey = hotkey;
          }
        }
      }

      updatedSelectedHotkeys[action] = hotkey;

      console.log('current hotkeys updated', currentHotkeys)
      setSelectedHotkeys(updatedSelectedHotkeys);
      await saveHotkeysConfig(currentHotkeys);
      toggleSavedMessage()
      setIsHotkeyInvalid(false)
      setConflictState({ action: '', hotkey: '' });
    } catch (error) {
      console.error('Error loading or updating hotkeys:', error);
    }
  };

  useEffect(() => {
    console.log('selected hotkeys changed', selectedHotkeys)
  }, [selectedHotkeys])


  type HotkeyEntry = {
    action: string | string[];
    hotkey: string;
  };

  function findHotkeyByAction(action: string, hotkeysConfig: HotkeyEntry[]): string {
    for (const hotkeyItem of hotkeysConfig) {
      const actions = hotkeyItem.action;
      console.log('actions', actions)
      if (actions === action) {
        return hotkeyItem.hotkey;
      } else if (action.includes('/')) {
        const actionParts = action.split('/');
        console.log('action parts', actionParts)
        if (typeof actions === 'string' && actionParts.includes(actions)) {
          return hotkeyItem.hotkey;
        } else if (Array.isArray(actions) && actionParts.some(part => actions.includes(part))) {
          return hotkeyItem.hotkey;
        }
      }
    }
    console.log('action not found', action, hotkeysConfig);
    return '';
  }

  return (
    <div className='container justify-center'>
      <h1 className='text-2xl text-center font-bold bg-gray-200 rounded-lg mb-4'>{title}</h1>
      <div className='flex flex-col gap-2'>
        {isHotkeyInvalid && conflictState && (
          <h1 className="text-base font-bold text-red-500">Error! {conflictState.hotkey.toUpperCase()} is already mapped to {conflictState.action}! Pick another hotkey!</h1>
        )}
        {actions.map((action, index) => {

          return (
            <div key={index} className='flex gap-4 items-center'>
              <h2 className='inline'>{action}</h2>
              <select
                ref={selectRefs.current[action]}
                value={selectedHotkeys[action]}
                onChange={(e) => handleHotkeyChange(action, e.target.value)}
                className="border rounded-md text-gray-600"
              >
                {validHotkeys.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleHotkeyChange(action, '')}
                className="mx-4 py-2 px-2 bg-red-500 hover:bg-red-300 text-white rounded-lg"
              >
                Disable
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
