<template>
    <div 
        v-if="yearList.length === 2"
        class="year__switcher year__switcher--two"
        :class="`year__switcher--${viewTheme}`"
    >
        <nuxt-link
            v-if="yearList[0] !== year()"
            :to="`/${yearList[0]}`"
            class="year__switcher--year"
        >
            {{ yearList[0] }}
            <div class="year__dot year__dot--big" />
        </nuxt-link>
        <div
            v-else 
            class="year__switcher--year year__switcher--year-current"
        >
            {{ yearList[0] }}
            <div class="year__dot year__dot--big year__dot--big-current" />
        </div>
        <div
            v-for="i in 4"
            :key="i"
            class="year__dot"
        />
        <nuxt-link
            v-if="yearList[1] !== year()"
            :to="`/${yearList[1]}`"
            class="year__switcher--year"
        >
            {{ yearList[1] }}
            <div class="year__dot year__dot--big" />
        </nuxt-link>
        <div
            v-else 
            class="year__switcher--year year__switcher--year-current"
        >
            {{ yearList[1] }}
            <div class="year__dot year__dot--big year__dot--big-current" />
        </div>
    </div>
    <div 
        v-else
        class="year__switcher year__switcher--three"
        :class="`year__switcher--${viewTheme}`"
    >
        <nuxt-link
            :to="`/${yearList[0]}`"
            class="year__switcher--year"
        >
            {{ yearList[0] }}
            <div class="year__dot year__dot--big" />
        </nuxt-link>
        <div
            v-for="i in 4"
            :key="i"
            class="year__dot"
        />
        <div class="year__switcher--year year__switcher--year-current">
            {{ year() }}
            <div class="year__dot year__dot--big year__dot--big-current" />
        </div>
        <div
            v-for="i in 4"
            :key="i + 4"
            class="year__dot"
        />
        <nuxt-link
            :to="`/${yearList[2]}`"
            class="year__switcher--year"
        >
            {{ yearList[2] }}
            <div class="year__dot year__dot--big" />
        </nuxt-link>
    </div>
</template>

<script lang="ts">
import { Vue, Component } from "vue-property-decorator";
import { State, namespace } from "vuex-class";
import { MCAInfo } from "../../../Interfaces/mca";

const mcaAyimModule = namespace("mca-ayim");

@Component
export default class YearSwitcher extends Vue {

    @State viewTheme!: "light" | "dark";

    @mcaAyimModule.State allMCA!: MCAInfo[];

    year () {
        return parseInt(this.$route.params.year, 10);
    }

    get yearList (): number[]  {
        const selectedYear = this.year();
        if (this.allMCA.length === 0 || (this.allMCA.length === 1 && this.allMCA[0].name === selectedYear))
            return [selectedYear - 1, selectedYear, selectedYear + 1];

        const min = Math.min(...this.allMCA.map(mca => mca.name));
        const max = Math.max(...this.allMCA.map(mca => mca.name));
        if (selectedYear < min)
            return [selectedYear, min];
        if (selectedYear > max)
            return [max, selectedYear];
        
        const closest = this.allMCA.reduce((p, c) => {
            const curr = Math.abs(c.name - selectedYear);
            const prev = Math.abs(p.name - selectedYear);
            if ((curr < prev && curr !== 0) || (curr > prev && prev === 0))
                return c;
            else
                return p;
        }).name;
        const i = this.allMCA.findIndex(mca => mca.name === closest);
        if (closest < selectedYear) {
            let arr = [closest, selectedYear];
            if (i < this.allMCA.length - 1)
                arr.push(this.allMCA[i + 1].name);
            return arr;
        } else {
            if (i > 0)
                return [this.allMCA[i - 1].name, selectedYear, closest];
            return [selectedYear, closest];
        }
    }
}
</script>

<style lang="scss">
@import '@s-sass/_variables'; 
@import '@s-sass/_mixins';

.year {
    &__switcher {
        &--light {
            background-color: white;
        }
        &--dark {
            background-color: $dark;
        }
        &--two {
            @include breakpoint(mobile) {
                margin-left: 0;
            }
            margin-left: auto;
            @include breakpoint(laptop) {
                /* 50vw - corsace logo width - icon margin - 4 icons - 2 dots - first year */
                margin-left: calc(50vw - 138px - 5px - (30px * 99 / 84 + 10px) * 4 - 21px * 2 - 23px);
            }
        }
        &--three {
            @include breakpoint(mobile) {
                margin-left: 0;
            }
            margin-left: auto;
            @include breakpoint(laptop) {
                /* 50vw - corsace logo width - icon margin - 4 icons - 4 dots - (first year + 1/2 of second year) */
                margin-left: calc(50vw - 138px - 5px - (40px * 99 / 84 + 10px) * 4 - 21px * 4 - 1.5 * 23px);
            }
        }
        @include breakpoint(mobile) {
            width: 100%;
            margin-right: 0;
        }
        margin-right: auto;

        display: flex;
        justify-content: center;
        align-items: flex-end;

        &--year {
            width: 23px;

            font-size: $font-sm;
            color: $light-blue;

            display: flex;
            flex-direction: column;
            align-items: center;

            margin-bottom: 19px;

            &:hover {
                text-decoration: none;
            }

            &-current {
                margin-bottom: 16px;
            }
        }
    }

    &__dot {
        height: 4px;
        width: 4px;

        display: flex;
        align-self: end;
        margin: 0 4.25px 23px;
        @include breakpoint(laptop) {
            margin: 0 8.5px 23px;
        }

        &--big {
            height: 11px;
            width: 11px;

            align-self: center;
            margin: 0;
            margin-top: 3px;

            &-current {
                height: 17px;
                width: 17px;

                background-color: #D8F0FA;
                
                border: 3px $light-blue solid;
                margin-top: 0;
            }
        }

        border-radius: 50%;
        background-color: $light-blue;

        position: relative;
    }
}
</style>