// Trimmed 1.6 saves for the read/write/inject paths. SAVE_1_6 has equipped
// hat/boots/rings/clothing and a weapon to clone; SAVE_1_6_BARE has none, so
// those types hit the bundled templates.

export const SAVE_1_6 = `<?xml version="1.0" encoding="utf-8"?>
<SaveGame xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <player>
    <name>Alex</name>
    <farmName>Willow</farmName>
    <favoriteThing>Coding</favoriteThing>
    <farmingLevel>3</farmingLevel>
    <miningLevel>1</miningLevel>
    <combatLevel>0</combatLevel>
    <foragingLevel>2</foragingLevel>
    <fishingLevel>5</fishingLevel>
    <luckLevel>0</luckLevel>
    <professions>
      <int>6</int>
    </professions>
    <experiencePoints>
      <int>770</int>
      <int>2150</int>
      <int>380</int>
      <int>100</int>
      <int>0</int>
      <int>0</int>
    </experiencePoints>
    <items>
      <Item xsi:nil="true" />
      <Item xsi:type="Object">
        <isLostItem>false</isLostItem>
        <category>-2</category>
        <hasBeenInInventory>true</hasBeenInInventory>
        <name>Diamond</name>
        <itemId>72</itemId>
        <parentSheetIndex>72</parentSheetIndex>
        <indexInTileSheet>72</indexInTileSheet>
        <SpecialVariable>0</SpecialVariable>
        <DisplayName>Diamond</DisplayName>
        <Name>Diamond</Name>
        <Category>-2</Category>
        <bigCraftable>false</bigCraftable>
        <type>Minerals</type>
        <price>750</price>
        <edibility>-300</edibility>
        <stack>1</stack>
        <quality>0</quality>
        <minutesUntilReady>0</minutesUntilReady>
        <preservedParentSheetIndex>0</preservedParentSheetIndex>
        <preserve xsi:nil="true" />
      </Item>
      <Item xsi:type="MeleeWeapon">
        <category>-98</category>
        <name>Rusty Sword</name>
        <parentSheetIndex>0</parentSheetIndex>
        <itemId>0</itemId>
        <Name>Rusty Sword</Name>
      </Item>
      <Item xsi:nil="true" />
      <Item xsi:nil="true" />
    </items>
    <maxItems>36</maxItems>
    <money>5000</money>
    <totalMoneyEarned>18000</totalMoneyEarned>
    <maxHealth>100</maxHealth>
    <maxStamina>270</maxStamina>
    <millisecondsPlayed>7200000</millisecondsPlayed>
    <seasonForSaveGame>0</seasonForSaveGame>
    <yearForSaveGame>1</yearForSaveGame>
    <dayOfMonthForSaveGame>1</dayOfMonthForSaveGame>
    <hat xsi:type="Hat">
      <isLostItem>false</isLostItem>
      <category>-95</category>
      <hasBeenInInventory>true</hasBeenInInventory>
      <name>Straw Hat</name>
      <itemId>3</itemId>
      <specialItem>false</specialItem>
      <isRecipe>false</isRecipe>
      <quality>0</quality>
      <stack>1</stack>
      <SpecialVariable>0</SpecialVariable>
      <which xsi:nil="true" />
      <skipHairDraw>false</skipHairDraw>
      <ignoreHairstyleOffset>true</ignoreHairstyleOffset>
      <hairDrawType>0</hairDrawType>
      <isPrismatic>false</isPrismatic>
    </hat>
    <boots xsi:type="Boots">
      <isLostItem>false</isLostItem>
      <category>-97</category>
      <hasBeenInInventory>true</hasBeenInInventory>
      <name>Leather Boots</name>
      <parentSheetIndex>506</parentSheetIndex>
      <itemId>506</itemId>
      <specialItem>false</specialItem>
      <isRecipe>false</isRecipe>
      <quality>0</quality>
      <stack>1</stack>
      <SpecialVariable>0</SpecialVariable>
      <defenseBonus>1</defenseBonus>
      <immunityBonus>1</immunityBonus>
      <indexInTileSheet>506</indexInTileSheet>
      <price>50</price>
      <indexInColorSheet>2</indexInColorSheet>
    </boots>
    <leftRing xsi:type="Ring">
      <isLostItem>false</isLostItem>
      <category>-96</category>
      <hasBeenInInventory>true</hasBeenInInventory>
      <name>Glow Ring</name>
      <parentSheetIndex>517</parentSheetIndex>
      <itemId>517</itemId>
      <specialItem>false</specialItem>
      <isRecipe>false</isRecipe>
      <quality>0</quality>
      <stack>1</stack>
      <SpecialVariable>0</SpecialVariable>
      <indexInTileSheet>517</indexInTileSheet>
      <uniqueID>1</uniqueID>
    </leftRing>
    <rightRing xsi:nil="true" />
    <shirtItem>
      <isLostItem>false</isLostItem>
      <category>-100</category>
      <hasBeenInInventory>true</hasBeenInInventory>
      <name>Aquamarine Shirt</name>
      <parentSheetIndex>9</parentSheetIndex>
      <itemId>1009</itemId>
      <specialItem>false</specialItem>
      <isRecipe>false</isRecipe>
      <quality>0</quality>
      <stack>1</stack>
      <SpecialVariable>0</SpecialVariable>
      <price>50</price>
      <indexInTileSheet>9</indexInTileSheet>
      <indexInTileSheetFemale xsi:nil="true" />
      <clothesType>0</clothesType>
      <dyeable>false</dyeable>
      <clothesColor><R>255</R><G>255</G><B>255</B><A>255</A></clothesColor>
      <isPrismatic>false</isPrismatic>
    </shirtItem>
    <pantsItem>
      <isLostItem>false</isLostItem>
      <category>-100</category>
      <hasBeenInInventory>true</hasBeenInInventory>
      <name>Farmer Pants</name>
      <parentSheetIndex>0</parentSheetIndex>
      <itemId>0</itemId>
      <specialItem>false</specialItem>
      <isRecipe>false</isRecipe>
      <quality>0</quality>
      <stack>1</stack>
      <SpecialVariable>0</SpecialVariable>
      <price>50</price>
      <indexInTileSheet>0</indexInTileSheet>
      <indexInTileSheetFemale xsi:nil="true" />
      <clothesType>1</clothesType>
      <dyeable>true</dyeable>
      <clothesColor><R>255</R><G>235</G><B>203</B><A>255</A></clothesColor>
      <isPrismatic>false</isPrismatic>
    </pantsItem>
  </player>
  <locations>
    <GameLocation xsi:type="Farm">
      <objects>
        <item>
          <key><Vector2><X>10</X><Y>12</Y></Vector2></key>
          <value>
            <Object xsi:type="Object">
              <isLostItem>false</isLostItem>
              <category>-999</category>
              <hasBeenInInventory>false</hasBeenInInventory>
              <name>Weeds</name>
              <itemId>784</itemId>
              <parentSheetIndex>784</parentSheetIndex>
              <indexInTileSheet>784</indexInTileSheet>
              <SpecialVariable>0</SpecialVariable>
              <DisplayName>Weeds</DisplayName>
              <Name>Weeds</Name>
              <Category>-999</Category>
              <bigCraftable>false</bigCraftable>
              <type>Litter</type>
              <price>0</price>
              <edibility>-300</edibility>
              <stack>1</stack>
              <quality>0</quality>
              <tileLocation><X>10</X><Y>12</Y></tileLocation>
              <owner>0</owner>
              <isSpawnedObject>true</isSpawnedObject>
              <minutesUntilReady>0</minutesUntilReady>
              <preservedParentSheetIndex>0</preservedParentSheetIndex>
            </Object>
          </value>
        </item>
      </objects>
    </GameLocation>
  </locations>
  <currentSeason>spring</currentSeason>
  <year>1</year>
  <dayOfMonth>1</dayOfMonth>
  <gameVersion>1.6.15</gameVersion>
</SaveGame>`

export const SAVE_1_6_BARE = `<?xml version="1.0" encoding="utf-8"?>
<SaveGame xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <player>
    <name>Abigail</name>
    <farmName>Bare</farmName>
    <favoriteThing>Pixels</favoriteThing>
    <farmingLevel>0</farmingLevel>
    <miningLevel>0</miningLevel>
    <combatLevel>0</combatLevel>
    <foragingLevel>0</foragingLevel>
    <fishingLevel>0</fishingLevel>
    <luckLevel>0</luckLevel>
    <professions />
    <experiencePoints>
      <int>0</int><int>0</int><int>0</int><int>0</int><int>0</int><int>0</int>
    </experiencePoints>
    <items>
      <Item xsi:nil="true" />
      <Item xsi:type="Object">
        <isLostItem>false</isLostItem>
        <category>-16</category>
        <hasBeenInInventory>true</hasBeenInInventory>
        <name>Wood</name>
        <itemId>388</itemId>
        <parentSheetIndex>388</parentSheetIndex>
        <SpecialVariable>0</SpecialVariable>
        <bigCraftable>false</bigCraftable>
        <type>Basic</type>
        <price>2</price>
        <edibility>-300</edibility>
        <stack>10</stack>
        <quality>0</quality>
        <minutesUntilReady>0</minutesUntilReady>
      </Item>
      <Item xsi:nil="true" />
      <Item xsi:nil="true" />
    </items>
    <maxItems>36</maxItems>
    <money>0</money>
    <totalMoneyEarned>0</totalMoneyEarned>
    <maxHealth>100</maxHealth>
    <maxStamina>270</maxStamina>
    <millisecondsPlayed>0</millisecondsPlayed>
    <hat xsi:nil="true" />
    <boots xsi:nil="true" />
    <leftRing xsi:nil="true" />
    <rightRing xsi:nil="true" />
  </player>
  <currentSeason>summer</currentSeason>
  <year>1</year>
  <dayOfMonth>1</dayOfMonth>
  <gameVersion>1.6.15</gameVersion>
</SaveGame>`

// Pre-1.6, no Object anywhere -> forces the legacy Object template.
export const SAVE_LEGACY_EMPTY = `<?xml version="1.0" encoding="utf-8"?>
<SaveGame xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <player>
    <name>Sam</name>
    <farmName>Old</farmName>
    <favoriteThing>Guitar</favoriteThing>
    <farmingLevel>0</farmingLevel>
    <miningLevel>0</miningLevel>
    <combatLevel>0</combatLevel>
    <foragingLevel>0</foragingLevel>
    <fishingLevel>0</fishingLevel>
    <luckLevel>0</luckLevel>
    <professions />
    <experiencePoints>
      <int>0</int><int>0</int><int>0</int><int>0</int><int>0</int><int>0</int>
    </experiencePoints>
    <items>
      <Item xsi:nil="true" />
      <Item xsi:nil="true" />
    </items>
    <maxItems>12</maxItems>
    <money>0</money>
    <totalMoneyEarned>0</totalMoneyEarned>
    <maxHealth>100</maxHealth>
    <maxStamina>270</maxStamina>
    <millisecondsPlayed>0</millisecondsPlayed>
  </player>
  <currentSeason>fall</currentSeason>
  <year>1</year>
  <dayOfMonth>5</dayOfMonth>
  <gameVersion>1.5.6</gameVersion>
</SaveGame>`
